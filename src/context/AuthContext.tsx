import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { safeSetDoc } from '../services/firestoreService';
import firebaseConfig from '../../firebase-applet-config.json';

export interface AuthErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  details?: string;
  action?: string;
}

export function parseFirebaseAuthError(err: any): AuthErrorInfo {
  const code: string = err?.code || 'auth/unknown';
  const rawMessage: string = err?.message || String(err || 'Unknown error');

  let userMessage = 'Authentication failed. Please try again.';
  let details: string | undefined;
  let action: string | undefined;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  switch (code) {
    case 'auth/unauthorized-domain':
      userMessage = `This domain (${currentHostname}) is not authorized in your Firebase project.`;
      details = `Firebase Authentication rejected the OAuth request because "${currentHostname}" is not on the Authorized Domains allowlist for project "${firebaseConfig.projectId}".`;
      action = `Manual Project Owner Action: Go to Firebase Console -> ${firebaseConfig.projectId} -> Authentication -> Settings -> Authorized domains -> Click "Add domain" and add "${currentHostname}". Alternatively, sign in using Email and Password below without domain restrictions.`;
      break;

    case 'auth/account-exists-with-different-credential':
      userMessage = 'An account already exists with the same email using a different sign-in method.';
      details = 'You may have previously registered with email/password or a different provider.';
      action = 'Sign in using your original method or link accounts in your Firebase account settings.';
      break;

    case 'auth/popup-closed-by-user':
      userMessage = 'Google Sign-In popup closed before completion.';
      details = 'If the popup closed instantly without prompting for Google accounts, this typically occurs when: (1) "localhost" is missing from Firebase Authorized Domains, (2) Google provider is disabled in Firebase Console, or (3) browser privacy settings / ad-blockers block third-party storage/popups.';
      action = '1. Verify "localhost" is in Firebase Console -> Authentication -> Settings -> Authorized domains. 2. Verify Google is enabled under Sign-in method. 3. Alternatively, use "Sign in with Redirect".';
      break;

    case 'auth/popup-blocked':
      userMessage = 'Google Sign-In popup was blocked by your browser.';
      details = 'Your web browser or an extension blocked the authentication popup from opening.';
      action = 'Allow popups for http://localhost:3000 in your browser address bar, or use "Sign in with Redirect".';
      break;

    case 'auth/operation-not-allowed':
      userMessage = 'Google Sign-In provider is disabled in Firebase project.';
      details = 'The Google Identity Provider is not enabled in Firebase Authentication.';
      action = `Go to Firebase Console -> ${firebaseConfig.projectId} -> Authentication -> Sign-in method -> Click "Google", toggle "Enable", choose a support email, and click "Save".`;
      break;

    case 'auth/cancelled-popup-request':
      userMessage = 'Previous popup request was cancelled by a new request.';
      details = 'Multiple sign-in attempts were made before the first popup completed.';
      action = 'Please wait a moment and click "Continue with Google" once.';
      break;

    case 'auth/network-request-failed':
      userMessage = 'Network error communicating with Firebase Auth.';
      details = 'Could not reach Firebase Authentication servers. Check your internet connection or firewall/VPN settings.';
      action = 'Verify network connectivity and retry.';
      break;

    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      userMessage = 'Invalid email or password.';
      break;

    case 'auth/user-disabled':
      userMessage = 'This user account has been disabled.';
      break;

    case 'auth/email-already-in-use':
      userMessage = 'An account with this email already exists.';
      break;

    case 'auth/weak-password':
      userMessage = 'Password should be at least 6 characters.';
      break;

    case 'auth/invalid-email':
      userMessage = 'Please enter a valid email address.';
      break;

    case 'auth/too-many-requests':
      userMessage = 'Too many failed login attempts. Please try again later.';
      break;

    default:
      userMessage = rawMessage || 'An unexpected authentication error occurred.';
      details = rawMessage;
      break;
  }

  return {
    code,
    message: rawMessage,
    userMessage,
    details,
    action
  };
}

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  authError: string | null;
  authErrorInfo: AuthErrorInfo | null;
  clearAuthError: () => void;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGoogleRedirect: () => Promise<void>;
  signOut: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authErrorInfo, setAuthErrorInfo] = useState<AuthErrorInfo | null>(null);

  const clearAuthError = () => {
    setAuthError(null);
    setAuthErrorInfo(null);
  };

  // Sync user profile to Firestore `/users/{uid}` on login / registration
  const syncUserProfile = async (firebaseUser: FirebaseUser, displayName?: string) => {
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      const name = displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
      
      if (!userSnap.exists()) {
        await safeSetDoc(userRef, {
          uid: firebaseUser.uid,
          displayName: name,
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          role: 'Knowledge Architect',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } else if (displayName && userSnap.data()?.displayName !== displayName) {
        await safeSetDoc(userRef, {
          displayName,
          updated_at: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err: any) {
      console.warn('Could not sync user profile to Firestore:', err?.message || err);
    }
  };

  useEffect(() => {
    // Process redirect result if returning from a full-page redirect flow
    getRedirectResult(auth)
      .then(async (cred) => {
        if (cred?.user) {
          await syncUserProfile(cred.user);
        }
      })
      .catch((err) => {
        console.warn('Firebase getRedirectResult note:', err?.code, err?.message);
        const parsed = parseFirebaseAuthError(err);
        setAuthError(parsed.userMessage);
        setAuthErrorInfo(parsed);
      });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        await syncUserProfile(currentUser);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    clearAuthError();
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await syncUserProfile(cred.user);
    } catch (err: any) {
      console.error('Sign in error:', err);
      const parsed = parseFirebaseAuthError(err);
      setAuthError(parsed.userMessage);
      setAuthErrorInfo(parsed);
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    clearAuthError();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (name && cred.user) {
        try {
          await updateFirebaseProfile(cred.user, { displayName: name });
        } catch (nameErr) {
          console.warn('Could not set displayName on Firebase Auth user:', nameErr);
        }
      }
      await syncUserProfile(cred.user, name);
    } catch (err: any) {
      console.error('Sign up error:', err);
      const parsed = parseFirebaseAuthError(err);
      setAuthError(parsed.userMessage);
      setAuthErrorInfo(parsed);
      throw err;
    }
  };

  const createConfiguredGoogleProvider = (): GoogleAuthProvider => {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    return provider;
  };

  const signInWithGoogle = async () => {
    clearAuthError();
    try {
      const provider = createConfiguredGoogleProvider();
      const cred = await signInWithPopup(auth, provider);
      if (cred?.user) {
        await syncUserProfile(cred.user);
      }
    } catch (err: any) {
      const isCancellation = err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request';
      if (isCancellation) {
        console.info('Google sign-in popup closed or cancelled by user/browser.');
      } else {
        console.warn('Firebase Google Sign-In Popup issue:', err?.code, err?.message);
      }
      const parsed = parseFirebaseAuthError(err);
      setAuthError(parsed.userMessage);
      setAuthErrorInfo(parsed);
      // Return gracefully on popup cancellation rather than rethrowing
      if (isCancellation) {
        return;
      }
      throw err;
    }
  };

  const signInWithGoogleRedirect = async () => {
    clearAuthError();
    try {
      const provider = createConfiguredGoogleProvider();
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.warn('Firebase Google Sign-In Redirect issue:', err?.code, err?.message);
      const parsed = parseFirebaseAuthError(err);
      setAuthError(parsed.userMessage);
      setAuthErrorInfo(parsed);
      throw err;
    }
  };

  const signOut = async () => {
    clearAuthError();
    try {
      await firebaseSignOut(auth);
    } catch (err: any) {
      console.error('Sign out error:', err);
      const parsed = parseFirebaseAuthError(err);
      setAuthError(parsed.userMessage);
      setAuthErrorInfo(parsed);
      throw err;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        authErrorInfo,
        clearAuthError,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithGoogleRedirect,
        signOut,
        getIdToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

