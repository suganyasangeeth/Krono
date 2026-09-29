import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
];

const effectiveFirebaseConfig = {
  ...firebaseConfig,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
};

const app = initializeApp(effectiveFirebaseConfig);
export const auth = getAuth(app);
export const googleAuthProvider = new GoogleAuthProvider();

googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
// Store tokens strictly in memory (never in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;
let cachedIdToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, accessToken: string | null, idToken: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      try {
        cachedIdToken = await user.getIdToken();
        if (onAuthSuccess) {
          onAuthSuccess(user, cachedAccessToken, cachedIdToken);
        }
      } catch {
        cachedIdToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        cachedIdToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
  idToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get Google Drive access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    cachedIdToken = await result.user.getIdToken();
    return {
      user: result.user,
      accessToken: cachedAccessToken,
      idToken: cachedIdToken,
    };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getIdToken = async (): Promise<string | null> => {
  if (auth.currentUser) {
    try {
      cachedIdToken = await auth.currentUser.getIdToken();
    } catch {
      // fallback to cached in-memory token
    }
  }
  return cachedIdToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  cachedIdToken = null;
};
