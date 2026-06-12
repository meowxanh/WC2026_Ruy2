import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAxfBeahH1rDfSzvz5LyAswJpMtgqy97Vk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "wc-tracker-nhom.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "wc-tracker-nhom",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "wc-tracker-nhom.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "916626680795",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:916626680795:web:68f2bb47502a0d728ed5fe",
};

export const app = initializeApp(firebaseConfig);
export { firebaseConfig };

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
