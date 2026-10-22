import { GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './firebase';

export const WEB_CLIENT_ID = '336719988763-a8l7noum7dapki5st6uoqvscnnlkid7e.apps.googleusercontent.com';

let GoogleSignin: any = null;
let statusCodes: any = {};
let isErrorWithCode: any = () => false;

try {
  const GSI = require('@react-native-google-signin/google-signin');
  GoogleSignin = GSI.GoogleSignin;
  statusCodes = GSI.statusCodes;
  isErrorWithCode = GSI.isErrorWithCode;

  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
  });
} catch (e) {
  console.warn('[GoogleAuth] Google Sign-In native module not found or running in Expo Go.');
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
      error: 'Google Sign-In requires a standalone APK or EAS Dev Build. It is not supported in Expo Go.',
    };
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();
    const idToken = userInfo.data?.idToken || (userInfo as any).idToken;

    if (!idToken) {
      return {
        success: false,
        error: 'No ID Token returned from Google. Please verify OAuth client ID configuration.',
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

    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, cancelled: true };
      }
      if (error.code === statusCodes.IN_PROGRESS) {
        return { success: false, error: 'Sign-in is already in progress.' };
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { success: false, error: 'Google Play Services are missing or outdated.' };
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
