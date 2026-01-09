import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

/**
 * Wait for Firebase Auth to be ready and return the current user.
 * This ensures the auth token is attached to subsequent Firestore requests.
 * Use this in services before making authenticated Firestore calls.
 */
export function waitForAuth(): Promise<User | null> {
  return new Promise((resolve) => {
    // If there's already a current user, resolve immediately
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    
    // Otherwise wait for auth state to be determined
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Ensure user is authenticated before proceeding.
 * Throws an error if not authenticated.
 */
export async function requireAuth(): Promise<User> {
  const user = await waitForAuth();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export default app;

