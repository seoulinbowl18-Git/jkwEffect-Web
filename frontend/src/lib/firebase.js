import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase web config. These values are public identifiers (not secrets); access is
// controlled by Firebase Auth's authorized domains and server-side token verification.
const projectId = process.env.REACT_APP_FIREBASE_PROJECT_ID || "jkweffect";
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDLiYiHvb410KO5EUSn4CDHLB2BmTGbh8U",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:947545771474:web:9ab22e01487c31979bcc0b",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "947545771474",
  projectId,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || (projectId && `${projectId}.firebaseapp.com`),
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "jkweffect.firebasestorage.app",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-XZ8JH89WB0",
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
