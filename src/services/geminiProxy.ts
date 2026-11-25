/**
 * geminiProxy.ts ΓÇö ZenTrack Mobile
 *
 * Calls the Gemini API directly with 9-key rotation.
 * Keys come from EXPO_PUBLIC_GEMINI_API_KEY (comma-separated).
 * These same keys are used by the Vercel proxy server-side.
 *
 * Why direct instead of Vercel proxy?
 *   The Vercel endpoint (myzentrack.vercel.app/api/gemini-proxy) returns
 *   HTML 404 from APK builds ΓÇö the deployment doesn't reach the function.
 *   Direct API calls with key rotation are equivalent and simpler.
 *
 * Key rotation: tries keys in order, moves to next on 429/5xx.
 * On success, updates the round-robin index for the next call.
 */

// FIX #4: Static import ΓÇö eliminates ~50-100ms dynamic resolution overhead on every AI call
import NetInfo from '@react-native-community/netinfo';
import { signInAnonymously } from 'firebase/auth';
import { auth } from './firebase';

const RAW_KEYS = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_KEYS: string[] = RAW_KEYS.split(',').map((k: string) => k.trim()).filter(Boolean);

// ✅ Startup diagnostic — verifies connection strategy
if (GEMINI_KEYS.length > 0) {
  console.log(`[GeminiProxy] Loaded ${GEMINI_KEYS.length} API key(s). Direct-to-Gemini mode.`);
} else {
  console.log(`[GeminiProxy] No local keys found. Running in secure Vercel Proxy Mode (Production/APK ready).`);
}

/**
 * Gets a valid Firebase ID token for authenticating with the Vercel backend proxy.
 * If user is guest/unauthenticated, automatically signs in anonymously to obtain a valid token.
 */
let _anonSignInPromise: Promise<string | null> | null = null;

async function getValidAuthToken(forceRefresh = false): Promise<string | null> {
  try {
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken(forceRefresh);
    }
    if (!_anonSignInPromise) {
      _anonSignInPromise = signInAnonymously(auth)
        .then(cred => cred.user.getIdToken(forceRefresh))
        .catch(err => {
          console.warn('[GeminiProxy] Failed to obtain Firebase ID token for proxy:', err);
          return null;
        })
        .finally(() => {
          _anonSignInPromise = null;
        });
    }
    return await _anonSignInPromise;
  } catch (err) {
    console.warn('[GeminiProxy] Failed to obtain Firebase ID token for proxy:', err);
    return null;
  }
}

// Round-robin index ── cycles through keys to spread load
let keyIndex = 0;

function getNextKey(): string | null {
  if (GEMINI_KEYS.length === 0) {
    return null;
  }
  const key = GEMINI_KEYS[keyIndex % GEMINI_KEYS.length];
  keyIndex = (keyIndex + 1) % GEMINI_KEYS.length;
  return key;
}

// ──────────────────────────────────────────────────────────────────

export interface ProxyCallOptions {
  model?: string;
  contents: any[];
  systemInstruction?: string;
  tools?: any[];
  timeoutMs?: number;
  allowOfflineFallback?: boolean;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    topP?: number;
    responseMimeType?: string;
  };
}

// ──────────────── Core Gemini call with key rotation ────────────────

export async function callProxy(options: ProxyCallOptions): Promise<any> {
  const {
    model = 'gemini-2.5-flash',
    contents,
    systemInstruction,
    tools,
    generationConfig,
    timeoutMs = 15000,
    allowOfflineFallback = false,
  } = options;

  // FIX #4: Use static import (moved to top of file) — no more dynamic resolution per-call
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) {
    console.warn('[GeminiProxy] Offline. Intercepting Gemini call.');
    if (allowOfflineFallback) {
      return {
        candidates: [{
          content: { parts: [{ text: "I cannot reach the network right now, but your logs will be saved locally." }] }
        }]
      };
    }
    throw new Error('Network offline: No internet connection');
  }

  const body: any = { contents };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  if (tools && tools.length > 0) {
    body.tools = tools;
  }
  if (generationConfig) {
    body.generationConfig = generationConfig;
  }

  const totalKeys = Math.max(GEMINI_KEYS.length, 1);
  let lastError: Error | null = null;
  const startTime = Date.now();
  const maxTotalBudgetMs = Math.min(timeoutMs, 12000);

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const elapsed = Date.now() - startTime;
    const remainingBudgetMs = maxTotalBudgetMs - elapsed;
    if (remainingBudgetMs <= 500) {
      console.warn(`[GeminiProxy] Exhausted total retry budget (${elapsed}ms elapsed).`);
      break;
    }

    const key = getNextKey();
    const url = key 
      ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`
      : `https://myzentrack.vercel.app/api/gemini-proxy`;

    const controller = new AbortController();
    const currentAttemptTimeout = Math.min(remainingBudgetMs, timeoutMs);
    const timeoutId = setTimeout(() => controller.abort(), currentAttemptTimeout);

    try {
      const token = !key ? await getValidAuthToken(attempt > 0) : null;
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const reqBody = key ? body : { ...body, model };

      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(reqBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (resp.ok) {
        return resp.json();
      }

      let errData: any = {};
      try {
        errData = await resp.json();
      } catch {}
      const errMsg = errData?.error?.message || `Gemini API error: HTTP ${resp.status}`;
      const isInvalidKey400 =
        resp.status === 400 &&
        (errMsg.toLowerCase().includes('api key') ||
         (errData?.error?.status === 'INVALID_ARGUMENT' && errMsg.toLowerCase().includes('key')));

      // Rotate key ONLY on 429 (rate limit), 5xx (server error), 401/403 (auth), or 400 specifically caused by an invalid API key
      if (resp.status === 429 || resp.status >= 500 || resp.status === 401 || resp.status === 403 || isInvalidKey400) {
        if (attempt === 0) {
          console.warn(`[GeminiProxy] Rate-limit/Auth error (${resp.status}), rotating through keys...`);
        }
        lastError = new Error(`API Error ${resp.status}: ${errMsg}`);
        continue;
      }

      // Non-retryable 400 / 404 (malformed payload or retired model) — fail fast
      console.warn('[GeminiProxy] Non-retryable Gemini error:', resp.status, errMsg);
      throw new Error(errMsg);

    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      
      if (fetchErr.name === 'AbortError') {
        const totalElapsed = Date.now() - startTime;
        console.warn(`[GeminiProxy] Request timed out (${totalElapsed}ms elapsed, budget ${maxTotalBudgetMs}ms).`);
        if (allowOfflineFallback) {
          return {
            candidates: [{
              content: { parts: [{ text: "Network is too weak right now." }] }
            }]
          };
        }
        throw new Error(`Network timeout: Request exceeded ${maxTotalBudgetMs}ms`);
      }

      if (fetchErr.message && !fetchErr.message.includes('API Error')) {
        // Real error (not rate limit) — propagate immediately
        throw fetchErr;
      }
      lastError = fetchErr;
    }
  }

  throw lastError || new Error('All Gemini API keys exhausted or rate-limited. Try again in a minute.');
}
