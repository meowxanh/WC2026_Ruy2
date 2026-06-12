import { useState } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, firebaseConfig } from "../../lib/firebase";

export default function AdminCreateAccount() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(false);
    setError("");
    setSuccess("");

    if (!displayName || !email || !password) {
      setError("Vui lòng điền đầy đủ tất cả các trường.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);
    let secondaryApp;
    try {
      // Khởi tạo Firebase App phụ để tránh việc tự động đăng nhập tài khoản mới tạo (gây logout Admin)
      const appName = `SecondaryApp_${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);

      // Tạo tài khoản Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      
      // Cập nhật tên hiển thị trong Auth Profile
      await updateProfile(userCredential.user, { displayName });

      // Lưu thông tin người dùng vào Firestore
      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, {
        displayName,
        email,
        photoURL: null,
        provider: "password",
        correctPredictions: 0,
        totalPredictions: 0,
        createdAt: serverTimestamp(),
        isAdmin: false,
      });

      // Đăng xuất khỏi Firebase Auth phụ
      await signOut(secondaryAuth);

      setSuccess(`🎉 Tạo tài khoản thành công cho: ${displayName} (${email})`);
      setDisplayName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error("Admin user creation error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Email này đã được sử dụng bởi tài khoản khác.");
      } else if (err.code === "auth/invalid-email") {
        setError("Email không đúng định dạng.");
      } else if (err.code === "auth/weak-password") {
        setError("Mật khẩu quá yếu (phải chứa ít nhất 6 ký tự).");
      } else {
        setError(err.message || "Đã có lỗi xảy ra khi tạo tài khoản.");
      }
    } finally {
      if (secondaryApp) {
        try {
          await secondaryApp.delete();
        } catch (e) {
          console.warn("Error deleting secondary app:", e);
        }
      }
      setLoading(false);
    }
  };

  return (
    <div className="admin-create-page">
      <div className="login-card" style={{ margin: "20px auto" }}>
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo-icon">👤</span>
          </div>
          <h1 className="login-title">Tạo Tài Khoản</h1>
          <p className="login-subtitle">Chỉ dành cho Admin cấp tài khoản người chơi</p>
          <div className="login-divider">
            <span className="login-divider-star">★</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error-msg">{error}</div>}
          {success && (
            <div className="auth-error-msg" style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
              {success}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="displayName">Họ và tên người chơi</label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Nguyễn Văn A"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@example.com"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Mật khẩu ban đầu</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-btn auth-submit-btn"
          >
            {loading ? (
              <span className="spinner spinner-btn"></span>
            ) : (
              "Tạo tài khoản người chơi"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
