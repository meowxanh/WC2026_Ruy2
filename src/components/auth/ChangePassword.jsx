import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { useAuth } from "../../contexts/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới và xác nhận mật khẩu không khớp.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải chứa ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);
    try {
      // Kiểm tra xem tài khoản có trường mật khẩu ảo trong Firestore không
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const firestorePassword = userDocSnap.exists() ? userDocSnap.data().password : null;

      if (firestorePassword) {
        // Luồng mật khẩu ảo
        if (currentPassword !== firestorePassword) {
          setError("Mật khẩu hiện tại không chính xác.");
          setLoading(false);
          return;
        }
        // Cập nhật trường password trong Firestore
        await updateDoc(userDocRef, {
          password: newPassword
        });
      } else {
        // Luồng Firebase Auth truyền thống (tài khoản cũ chưa chuyển đổi hoặc tài khoản Admin chính)
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
      }

      setSuccess("🎉 Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      
      // Chuyển hướng về trang chủ sau 2 giây
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Change password error:", err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Mật khẩu hiện tại không chính xác.");
      } else {
        setError(err.message || "Đã có lỗi xảy ra. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <div className="login-card" style={{ margin: "20px auto" }}>
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo-icon">🔑</span>
          </div>
          <h1 className="login-title">Đổi Mật Khẩu</h1>
          <p className="login-subtitle">Nhập thông tin bên dưới để thay đổi mật khẩu tài khoản</p>
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
            <label className="form-label" htmlFor="currentPassword">Mật khẩu hiện tại</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="newPassword">Mật khẩu mới</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              "Cập nhật mật khẩu"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
