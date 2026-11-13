import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase web config. These values are public identifiers (not secrets); access is
// controlled by Firebase Auth's authorized domains and server-side token verification.
const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || "ourbuzzer-951b4";
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDI6IFAM95JZl2UhzDDjsgB6SLrqE-837U",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:283209495186:web:e47325fff94f8658152c4b",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "283209495186",
  projectId,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || (projectId && `${projectId}.firebaseapp.com`),
};

export const firebaseReady = Boolean(firebaseConfig.authDomain);
if (!firebaseReady) {
  // eslint-disable-next-line no-console
  console.error("[auth] Set REACT_APP_FIREBASE_PROJECT_ID (or REACT_APP_FIREBASE_AUTH_DOMAIN) in frontend/.env");
}

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
firebaseAuth.languageCode = "id";

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
