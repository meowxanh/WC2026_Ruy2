import { createContext, useContext, useEffect, useState, useRef } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updatePassword,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, query, collection, where, getDocs, updateDoc } from "firebase/firestore";
import { auth, db, googleProvider, githubProvider, SYSTEM_SHARED_AUTH_PASSWORD } from "../lib/firebase";


const AuthContext = createContext(null);

const AUTH_TIMEOUT_MS = 4000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
        setUser(firebaseUser);
        
        // Xác định email admin (mặc định hỗ trợ meowxanh@gmail.com, admin@gmail.com, và env)
        const adminEmails = [
          "meowxanh@gmail.com",
          "admin@gmail.com",
          ...(import.meta.env.VITE_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase())
        ];
        const emailIsAdmin = firebaseUser.email && adminEmails.includes(firebaseUser.email.toLowerCase());
        let firestoreIsAdmin = false;

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
              isAdmin: emailIsAdmin,
            });
            firestoreIsAdmin = emailIsAdmin;
          } else {
            const data = userSnap.data();
            firestoreIsAdmin = data?.isAdmin || data?.role === "admin";
          }
        } catch (err) {
          console.warn("Firestore user sync skipped:", err.message);
        }
        setIsAdmin(emailIsAdmin || firestoreIsAdmin);
      } else {
        setUser(null);
        setIsAdmin(false);
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, SYSTEM_SHARED_AUTH_PASSWORD);
    await updateProfile(userCredential.user, { displayName });
    
    // Xác định email admin
    const adminEmails = [
      "meowxanh@gmail.com",
      "admin@gmail.com",
      ...(import.meta.env.VITE_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase())
    ];
    const emailIsAdmin = email && adminEmails.includes(email.toLowerCase());

    // Lưu thông tin người dùng vào Firestore
    try {
      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, {
        displayName: displayName,
        email: email,
        photoURL: null,
        provider: "password",
        password: password, // Save the actual password in Firestore
        correctPredictions: 0,
        totalPredictions: 0,
        createdAt: serverTimestamp(),
        isAdmin: emailIsAdmin,
      }, { merge: true });
    } catch (err) {
      console.warn("Firestore email signup sync skipped:", err.message);
    }
    
    // Cập nhật lại user local state
    setUser({ ...userCredential.user, displayName });
    setIsAdmin(emailIsAdmin);
    return userCredential.user;
  };

  const loginWithEmail = async (email, password) => {
    try {
      const q = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      let firestoreUserDoc = null;
      querySnapshot.forEach(doc => {
        firestoreUserDoc = doc.data();
      });

      if (firestoreUserDoc && firestoreUserDoc.password) {
        // Virtual password flow
        if (firestoreUserDoc.password !== password) {
          const err = new Error("Wrong password");
          err.code = "auth/wrong-password";
          throw err;
        }
        // Log in with the system shared password
        return await signInWithEmailAndPassword(auth, email, SYSTEM_SHARED_AUTH_PASSWORD);
      } else if (firestoreUserDoc) {
        // Standard account login flow - attempt login with entered password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // If login succeeds, auto-migrate this account to virtual password system
        try {
          const userRef = doc(db, "users", userCredential.user.uid);
          await updateDoc(userRef, {
            password: password
          });
          // Update the Firebase Auth password to SYSTEM_SHARED_AUTH_PASSWORD
          await updatePassword(userCredential.user, SYSTEM_SHARED_AUTH_PASSWORD);
          console.log(`Auto-migrated user ${email} to virtual password system.`);
        } catch (migrationErr) {
          console.warn("Auto-migration to virtual password failed:", migrationErr);
        }
        return userCredential;
      }
    } catch (err) {
      // Re-throw Wrong Password or Invalid Credentials errors
      if (
        err.code === "auth/wrong-password" || 
        err.code === "auth/invalid-credential" ||
        err.message === "Wrong password"
      ) {
        throw err;
      }
      console.warn("Firestore lookup failed or standard fallback login error:", err);
    }
    // Final fallback to standard sign-in (e.g. if Firestore queries failed or user not in users collection)
    return signInWithEmailAndPassword(auth, email, password);
  };


  const logout = () => {
    setIsAdmin(false);
    return signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
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
