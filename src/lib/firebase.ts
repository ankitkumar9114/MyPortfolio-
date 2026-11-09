import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

// Firebase web config from .env.local (NEXT_PUBLIC_*, inlined at build time,
// so each one must be referenced literally). If it's missing, the site falls
// back to its built-in case studies instead of crashing.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

export const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").toLowerCase();

export function firebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null;
  return getApps().length ? getApp() : initializeApp(config);
}

export function db(): Firestore | null {
  const app = firebaseApp();
  return app ? getFirestore(app) : null;
}
