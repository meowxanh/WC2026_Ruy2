import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp, collection, query, onSnapshot, updateDoc } from "firebase/firestore";
import { db, firebaseConfig, SYSTEM_SHARED_AUTH_PASSWORD } from "../../lib/firebase";


export default function AdminCreateAccount() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Các state và effect cho tính năng Quản lý/Cấp lại mật khẩu người chơi
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [resettingUser, setResettingUser] = useState(null);
  const [newPasswords, setNewPasswords] = useState({});

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })).sort((a, b) => (a.displayName || "").localeCompare(b.displayName || ""));
      setUsers(list);
      setLoadingUsers(false);
    }, (err) => {
      console.error("Error listening to users:", err);
      setLoadingUsers(false);
    });
    return () => unsubscribe();
  }, []);

  const handleResetPassword = async (userId, userEmail) => {
    const newPwd = newPasswords[userId];
    if (!newPwd || newPwd.trim().length < 6) {
      alert("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    try {
      setResettingUser(userId);
      const userRef = doc(db, "users", userId);
      
      // Cập nhật mật khẩu trong Firestore
      await updateDoc(userRef, {
        password: newPwd.trim()
      });

      alert(`🔑 Cấp lại mật khẩu thành công cho ${userEmail}!\nMật khẩu mới: ${newPwd.trim()}`);
      setNewPasswords(prev => ({ ...prev, [userId]: "" }));
    } catch (err) {
      console.error("Reset password error:", err);
      alert("Đã xảy ra lỗi khi cấp lại mật khẩu: " + err.message);
    } finally {
      setResettingUser(null);
    }
  };


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
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, SYSTEM_SHARED_AUTH_PASSWORD);
      
      // Cập nhật tên hiển thị trong Auth Profile
      await updateProfile(userCredential.user, { displayName });

      // Lưu thông tin người dùng vào Firestore
      const userRef = doc(db, "users", userCredential.user.uid);
      await setDoc(userRef, {
        displayName,
        email,
        photoURL: null,
        provider: "password",
        password, // Lưu mật khẩu thực tế vào Firestore
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

      {/* Danh sách người chơi và Cấp lại mật khẩu */}
      <div className="login-card" style={{ maxWidth: "850px", margin: "30px auto", padding: "30px" }}>
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo-icon">🔑</span>
          </div>
          <h2 className="login-title" style={{ fontSize: "1.6rem" }}>Danh Sách Tài Khoản</h2>
          <p className="login-subtitle">Xem mật khẩu ảo hiện tại hoặc đổi mật khẩu trực tiếp cho người chơi</p>
          <div className="login-divider">
            <span className="login-divider-star">★</span>
          </div>
        </div>

        {loadingUsers ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>
            <span className="spinner spinner-btn" style={{ display: "inline-block", marginRight: "8px" }}></span> Đang tải danh sách người chơi...
          </div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: "20px" }}>
            Chưa có tài khoản người chơi nào.
          </div>
        ) : (
          <div className="admin-users-table-container" style={{ marginTop: "20px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "var(--text-primary)", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border-subtle)", color: "var(--text-secondary)", textAlign: "left" }}>
                  <th style={{ padding: "12px 8px" }}>Người chơi</th>
                  <th style={{ padding: "12px 8px" }}>Email</th>
                  <th style={{ padding: "12px 8px" }}>Mật khẩu hiện tại</th>
                  <th style={{ padding: "12px 8px", minWidth: "240px" }}>Cấp lại mật khẩu</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const hasVirtualPassword = !!u.password;
                  return (
                    <tr key={u.uid} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "14px 8px", fontWeight: "600" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <img
                            src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || "U")}&background=f59e0b&color=0a0e1a&bold=true`}
                            alt={u.displayName}
                            style={{ width: "24px", height: "24px", borderRadius: "50%" }}
                          />
                          <span style={{ whiteSpace: "nowrap" }}>{u.displayName}</span>
                          {u.isAdmin && (
                            <span style={{
                              color: "var(--accent-gold)",
                              fontSize: "0.7rem",
                              background: "rgba(245, 158, 11, 0.1)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              border: "1px solid rgba(245, 158, 11, 0.2)",
                              fontWeight: "bold",
                              whiteSpace: "nowrap"
                            }}>
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: "14px 8px", color: "var(--text-secondary)" }}>{u.email}</td>
                      <td style={{ padding: "14px 8px" }}>
                        {hasVirtualPassword ? (
                          <code style={{
                            background: "rgba(16, 185, 129, 0.1)",
                            border: "1px solid rgba(16, 185, 129, 0.2)",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            color: "#34d399",
                            fontFamily: "monospace",
                            fontSize: "0.85rem"
                          }}>
                            {u.password}
                          </code>
                        ) : (
                          <span
                            style={{ color: "var(--text-secondary)", fontSize: "0.78rem", fontStyle: "italic" }}
                            title="Tài khoản tạo bằng phương thức cũ. Khi người chơi đăng nhập lần đầu bằng mật khẩu cũ, hệ thống sẽ tự động chuyển đổi sang cơ chế mật khẩu ảo."
                          >
                            Tài khoản cũ
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 8px" }}>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <input
                            type="text"
                            placeholder="Mật khẩu mới (>=6 ký tự)"
                            value={newPasswords[u.uid] || ""}
                            onChange={(e) => setNewPasswords(prev => ({ ...prev, [u.uid]: e.target.value }))}
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "4px",
                              color: "var(--text-primary)",
                              padding: "4px 8px",
                              fontSize: "0.8rem",
                              width: "140px",
                              outline: "none"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleResetPassword(u.uid, u.email)}
                            disabled={resettingUser === u.uid}
                            className="login-btn"
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.78rem",
                              borderRadius: "4px",
                              width: "auto",
                              marginTop: 0,
                              background: "linear-gradient(135deg, var(--accent-gold), #d97706)",
                              color: "var(--primary-dark)",
                              fontWeight: "600",
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            {resettingUser === u.uid ? "⏳..." : "Cấp lại"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
