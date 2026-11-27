const fs = require('fs');
const path = require('path');
const Module = require('module');
const { EventEmitter } = require('events');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');

// Compile TypeScript modules on the fly for Node test execution
function compileTsModule(moduleObj, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      allowJs: true,
      resolveJsonModule: true,
    },
  });
  moduleObj._compile(transpiled.outputText, filename);
}

require.extensions['.ts'] = compileTsModule;
require.extensions['.tsx'] = compileTsModule;

// Shared mutable test environment state
const emitter = new EventEmitter();
const asyncStore = new Map();
const firestoreStore = new Map(); // key: `${col}/${docId}` -> object
const netListeners = new Set();
const authListeners = new Set();

const state = {
  isOnline: true,
  failureMode: 'none', // 'none' | 'unavailable' | 'permission-denied' | 'batch-fail-then-sequential'
  failureByDoc: new Map(), // `${col}/${docId}` -> 'unavailable' | 'permission-denied'
  commitHook: null,
  currentUser: { uid: 'user_test_1', isAnonymous: false },
  batchCount: 0,
  autoDocSeq: 1,
};

function isPlain(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === null || proto === Object.prototype;
}

function unflatten(obj) {
  if (!isPlain(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.includes('.')) {
      const parts = k.split('.');
      let cur = out;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!isPlain(cur[parts[i]])) cur[parts[i]] = {};
        cur = cur[parts[i]];
      }
      cur[parts[parts.length - 1]] = isPlain(v) ? unflatten(v) : v;
    } else {
      out[k] = isPlain(v) ? unflatten(v) : v;
    }
  }
  return out;
}

function applyFirestorePatch(existingDoc, rawPatch) {
  const patch = unflatten(rawPatch);
  const target = existingDoc ? JSON.parse(JSON.stringify(existingDoc)) : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object') {
      if (v._methodName === 'deleteField') {
        delete target[k];
        continue;
      }
      if (v._methodName === 'increment') {
        target[k] = (Number(target[k]) || 0) + Number(v._operand || 0);
        continue;
      }
      if (v._methodName === 'serverTimestamp') {
        target[k] = Date.now();
        continue;
      }
      if (isPlain(v) && isPlain(target[k])) {
        target[k] = applyFirestorePatch(target[k], v);
        continue;
      }
    }
    target[k] = v;
  }
  return target;
}

function makeDocError(code, msg) {
  const err = new Error(msg || code);
  err.code = code;
  return err;
}

function maybeThrowWriteError(col, id, isBatch = false) {
  const docMode = state.failureByDoc.get(`${col}/${id}`);
  const mode = docMode || state.failureMode;
  if (mode === 'unavailable') {
    throw makeDocError('unavailable', 'Simulated offline network unavailable');
  }
  if (mode === 'permission-denied') {
    throw makeDocError('permission-denied', 'Simulated permission-denied');
  }
  if (isBatch && state.failureMode === 'batch-fail-then-sequential') {
    throw makeDocError('unavailable', 'Simulated batch commit failure');
  }
}

const mockAsyncStorage = {
  getItem: async (k) => (asyncStore.has(k) ? asyncStore.get(k) : null),
  setItem: async (k, v) => { asyncStore.set(k, String(v)); },
  removeItem: async (k) => { asyncStore.delete(k); },
  multiGet: async (keys) => keys.map((k) => [k, asyncStore.has(k) ? asyncStore.get(k) : null]),
  multiSet: async (pairs) => { for (const [k, v] of pairs) asyncStore.set(k, String(v)); },
  multiRemove: async (keys) => { for (const k of keys) asyncStore.delete(k); },
  getAllKeys: async () => Array.from(asyncStore.keys()),
};

const mockReactNative = {
  DeviceEventEmitter: {
    emit: (ev, data) => emitter.emit(ev, data),
    addListener: (ev, fn) => {
      emitter.on(ev, fn);
      return { remove: () => emitter.off(ev, fn) };
    },
  },
  InteractionManager: {
    runAfterInteractions: (cb) => {
      const t = setTimeout(() => { try { cb?.(); } catch {} }, 0);
      return { cancel: () => clearTimeout(t) };
    },
  },
  AppState: {
    currentState: 'active',
    addEventListener: (_ev, _fn) => ({ remove: () => {} }),
  },
  Platform: { OS: 'android' },
  unstable_batchedUpdates: (fn) => fn(),
};

const mockNetInfo = {
  fetch: async () => ({ isConnected: state.isOnline, isInternetReachable: state.isOnline }),
  addEventListener: (fn) => {
    netListeners.add(fn);
    return () => netListeners.delete(fn);
  },
};

const mockAuth = {
  get currentUser() {
    return state.currentUser;
  },
};

const mockFirestore = {
  doc: (_dbOrCol, colOrId, maybeId) => {
    if (maybeId !== undefined) return { col: colOrId, id: maybeId, path: `${colOrId}/${maybeId}` };
    if (_dbOrCol && _dbOrCol.col) return { col: _dbOrCol.col, id: colOrId, path: `${_dbOrCol.col}/${colOrId}` };
    const id = `auto_${state.autoDocSeq++}`;
    return { col: _dbOrCol.col, id, path: `${_dbOrCol.col}/${id}` };
  },
  collection: (_db, col) => ({ col, get id() { return `auto_${state.autoDocSeq++}`; } }),
  deleteField: () => ({ _methodName: 'deleteField' }),
  increment: (n) => ({ _methodName: 'increment', _operand: n }),
  serverTimestamp: () => ({ _methodName: 'serverTimestamp' }),
  setDoc: async (docRef, data, opts = {}) => {
    maybeThrowWriteError(docRef.col, docRef.id);
    const key = `${docRef.col}/${docRef.id}`;
    const next = opts?.merge
      ? applyFirestorePatch(firestoreStore.get(key) || {}, data || {})
      : applyFirestorePatch({}, data || {});
    firestoreStore.set(key, next);
  },
  updateDoc: async (docRef, data) => {
    maybeThrowWriteError(docRef.col, docRef.id);
    const key = `${docRef.col}/${docRef.id}`;
    if (!firestoreStore.has(key)) {
      throw makeDocError('not-found', `No document to update at ${key}`);
    }
    firestoreStore.set(key, applyFirestorePatch(firestoreStore.get(key), data || {}));
  },
  deleteDoc: async (docRef) => {
    maybeThrowWriteError(docRef.col, docRef.id);
    firestoreStore.delete(`${docRef.col}/${docRef.id}`);
  },
  writeBatch: () => {
    const ops = [];
    return {
      set: (docRef, data, opts) => ops.push({ type: 'set', docRef, data, opts }),
      update: (docRef, data) => ops.push({ type: 'update', docRef, data }),
      delete: (docRef) => ops.push({ type: 'delete', docRef }),
      commit: async () => {
        state.batchCount++;
        if (typeof state.commitHook === 'function') {
          await state.commitHook();
        }
        for (const op of ops) {
          maybeThrowWriteError(op.docRef.col, op.docRef.id, true);
        }
        for (const op of ops) {
          const key = `${op.docRef.col}/${op.docRef.id}`;
          if (op.type === 'delete') firestoreStore.delete(key);
          else if (op.type === 'set') {
            firestoreStore.set(key, op.opts?.merge ? applyFirestorePatch(firestoreStore.get(key) || {}, op.data || {}) : applyFirestorePatch({}, op.data || {}));
          } else if (op.type === 'update') {
            if (!firestoreStore.has(key)) throw makeDocError('not-found', 'No doc');
            firestoreStore.set(key, applyFirestorePatch(firestoreStore.get(key), op.data || {}));
          }
        }
      },
    };
  },
};

const mockFirebaseAuth = {
  onAuthStateChanged: (_authObj, cb) => {
    authListeners.add(cb);
    return () => authListeners.delete(cb);
  },
  signInAnonymously: async () => ({ user: { uid: 'anon_1', isAnonymous: true } }),
  GoogleAuthProvider: { credential: () => ({}) },
};

const mockAvatarService = {
  AVATAR_BOOT_RECORD_KEY: '@zentrack_avatar_boot_record',
  seedAvatarMemoryCache: () => {},
};

const origLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'react-native') return mockReactNative;
  if (request === '@react-native-async-storage/async-storage') return mockAsyncStorage;
  if (request === '@react-native-community/netinfo') return mockNetInfo;
  if (request === 'firebase/firestore') return mockFirestore;
  if (request === 'firebase/auth') return mockFirebaseAuth;
  if (
    request === './firebase' ||
    request === '../services/firebase' ||
    request.endsWith('/services/firebase')
  ) {
    return { db: { __mockDb: true }, auth: mockAuth, googleProvider: {} };
  }
  if (
    request === '../services/userAvatarService' ||
    request.endsWith('/services/userAvatarService')
  ) {
    return mockAvatarService;
  }
  // Support extensionless relative TS imports when called cleanly
  if (request.startsWith('.') && parent?.filename) {
    const resolvedBase = path.resolve(path.dirname(parent.filename), request);
    if (!fs.existsSync(resolvedBase)) {
      if (fs.existsSync(resolvedBase + '.ts')) {
        return origLoad.call(this, resolvedBase + '.ts', parent, isMain);
      }
      if (fs.existsSync(resolvedBase + '.tsx')) {
        return origLoad.call(this, resolvedBase + '.tsx', parent, isMain);
      }
      if (fs.existsSync(path.join(resolvedBase, 'index.ts'))) {
        return origLoad.call(this, path.join(resolvedBase, 'index.ts'), parent, isMain);
      }
    }
  }
  return origLoad.call(this, request, parent, isMain);
};

globalThis.__ZENFIT_TEST_ENV__ = {
  ROOT,
  asyncStore,
  firestoreStore,
  emitter,
  state,
  setOnline(online) {
    state.isOnline = online;
    for (const fn of netListeners) {
      fn({ isConnected: online, isInternetReachable: online });
    }
  },
  setAuthUser(user) {
    state.currentUser = user;
    for (const fn of authListeners) {
      fn(user);
    }
  },
  resetStores() {
    asyncStore.clear();
    firestoreStore.clear();
    state.failureByDoc.clear();
    state.failureMode = 'none';
    state.commitHook = null;
    state.isOnline = true;
    state.batchCount = 0;
    state.currentUser = { uid: 'user_test_1', isAnonymous: false };
  },
};
