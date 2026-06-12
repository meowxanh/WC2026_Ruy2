import { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider, githubProvider } from "../lib/firebase";

const AuthContext = createContext(null);

const AUTH_TIMEOUT_MS = 4000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const resolved = useRef(false);

  useEffect(() => {
    let timeoutId;

    // Timeout: nếu Firebase Auth không phản hồi trong 4s → coi như chưa đăng nhập
    timeoutId = setTimeout(() => {
      if (!resolved.current) {
        resolved.current = true;
        setLoading(false);
      }
    }, AUTH_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      clearTimeout(timeoutId);
      resolved.current = true;

      if (firebaseUser) {
        // Chỉ set user khi có thông tin
        setUser(firebaseUser);
        // Tạo/cập nhật user document trong Firestore
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              displayName: firebaseUser.displayName || "Người dùng",
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              provider: firebaseUser.providerData[0]?.providerId || "unknown",
              correctPredictions: 0,
              totalPredictions: 0,
              createdAt: serverTimestamp(),
            });
          }
        } catch (err) {
          console.warn("Firestore user sync skipped:", err.message);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
  const signInWithGithub = () => signInWithPopup(auth, githubProvider);
  
  const signUpWithEmail = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    
    // Lưu thông tin người dùng vào Firestore
    try {
      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, {
        displayName: displayName,
        email: email,
        photoURL: null,
        provider: "password",
        correctPredictions: 0,
        totalPredictions: 0,
        createdAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn("Firestore email signup sync skipped:", err.message);
    }
    
    // Cập nhật lại user local state với displayName mới
    setUser({ ...userCredential.user, displayName });
    return userCredential.user;
  };

  const loginWithEmail = (email, password) => 
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signInWithGithub,
        signUpWithEmail,
        loginWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
