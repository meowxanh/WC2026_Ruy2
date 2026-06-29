import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function Login() {
  const { loginWithEmail, user } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState("");
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Nếu đã đăng nhập, redirect về trang chủ
  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoadingSubmit(true);

    // Basic Validation
    if (!email || !password) {
      setError("Vui lòng điền đầy đủ email và mật khẩu.");
      setLoadingSubmit(false);
      return;
    }

    try {
      await loginWithEmail(email, password);
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("Email hoặc mật khẩu không đúng.");
      } else if (err.code === "auth/invalid-email") {
        setError("Email không đúng định dạng.");
      } else {
        setError(err.message || "Đã có lỗi xảy ra khi đăng nhập.");
      }
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background decoration */}
      <div className="login-bg-decor">
        <div className="bg-orb bg-orb--1"></div>
        <div className="bg-orb bg-orb--2"></div>
        <div className="bg-orb bg-orb--3"></div>
      </div>

      <div className="login-card">
        {/* Logo section */}
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo-icon">⚽</span>
          </div>
          <h1 className="login-title">World Cup 2026</h1>
          <p className="login-subtitle">Dự đoán & Bình chọn Tỷ số</p>
          <div className="login-divider">
            <span className="login-divider-star">★</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error-msg">{error}</div>}
          
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Mật khẩu</label>
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
            disabled={loadingSubmit}
            className="login-btn auth-submit-btn"
          >
            {loadingSubmit ? (
              <span className="spinner spinner-btn"></span>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
