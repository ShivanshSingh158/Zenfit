import { GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';

export const WEB_CLIENT_ID = '336719988763-a8l7noum7dapki5st6uoqvscnnlkid7e.apps.googleusercontent.com';

let GoogleSignin: any = null;
let statusCodes: any = {};
let isErrorWithCode: any = () => false;

try {
  const GSI = require('@react-native-google-signin/google-signin');
  GoogleSignin = GSI?.GoogleSignin || null;
  statusCodes = GSI?.statusCodes || {};
  isErrorWithCode = GSI?.isErrorWithCode || (() => false);
} catch (e) {
  // Native module is linked in standalone APK build; Expo Go falls back gracefully
}

export interface GoogleAuthResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
  user?: any;
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  if (!GoogleSignin) {
    return {
      success: false,
      error: 'Google Sign-In is unavailable in this environment. Please sign in with email.',
    };
  }

  try {
    // Configure Google Sign In on demand to guarantee native Android Activity is ready
    await GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: false,
    });

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    
    // In @react-native-google-signin/google-signin v16:
    // signIn() returns { type: 'success', data: { idToken, user } } or { type: 'cancelled' }
    const response = await GoogleSignin.signIn();

    if (response?.type === 'cancelled') {
      return { success: false, cancelled: true };
    }

    const idToken = response?.data?.idToken || (response as any)?.idToken;

    if (!idToken) {
      return {
        success: false,
        error: 'No ID Token returned from Google. Please check network connection.',
      };
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);

    return {
      success: true,
      user: userCredential.user,
    };
  } catch (error: any) {
    console.error('[GoogleAuth] Sign-in error:', error);

    if (isErrorWithCode && isErrorWithCode(error)) {
      if (error.code === statusCodes?.SIGN_IN_CANCELLED) {
        return { success: false, cancelled: true };
      }
      if (error.code === statusCodes?.IN_PROGRESS) {
        return { success: false, error: 'Sign-in is already in progress.' };
      }
      if (error.code === statusCodes?.PLAY_SERVICES_NOT_AVAILABLE) {
        return { success: false, error: 'Google Play Services are missing or outdated.' };
      }
      if (error.code === '10' || error.message?.includes('DEVELOPER_ERROR')) {
        return {
          success: false,
          error: 'Unable to connect to Google Services. Please ensure your device has a Google account connected or sign in with email.',
        };
      }
    }

    return {
      success: false,
      error: error?.message || 'An unexpected error occurred during Google sign-in.',
    };
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    if (GoogleSignin) {
      await GoogleSignin.signOut().catch(() => {});
    }
    await firebaseSignOut(auth);
  } catch (e) {
    console.error('[GoogleAuth] Sign-out error:', e);
  }
}
