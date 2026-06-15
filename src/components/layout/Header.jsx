import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light-theme");
    } else {
      document.body.classList.remove("light-theme");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"));
  };

  const navItems = useMemo(() => {
    const items = [
      { path: "/", label: "Trận đấu", icon: "⚽" },
      { path: "/leaderboard", label: "Bảng xếp hạng", icon: "🏆" },
    ];
    if (user) {
      if (isAdmin) {
        items.push({ path: "/admin/create-account", label: "Tạo tài khoản", icon: "👤" });
        items.push({ path: "/admin/add-match", label: "Thêm trận đấu", icon: "➕" });
      }
      items.push({ path: "/change-password", label: "Đổi mật khẩu", icon: "🔑" });
    }
    return items;
  }, [user, isAdmin]);

  return (
    <header className="header">
      <div className="header-inner">
        {/* Logo */}
        <Link to="/" className="header-logo">
          <span className="logo-icon">⚽</span>
          <div className="logo-text">
            <span className="logo-title">WC 2026</span>
            <span className="logo-subtitle">Dự đoán & Bình chọn</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="header-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${location.pathname === item.path ? "nav-link--active" : ""}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Theme Toggle & User Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            onClick={toggleTheme}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "8px",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              transition: "transform 0.2s, background-color 0.2s"
            }}
            className="theme-toggle-btn"
            title={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
            aria-label={theme === "dark" ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>

          {user && (
            <div className="header-user">
              <img
                src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}&background=f59e0b&color=0a0e1a&bold=true`}
                alt={user.displayName}
                className="user-avatar"
                referrerPolicy="no-referrer"
              />
              <span className="user-name">{user.displayName}</span>
              <button onClick={logout} className="btn-logout" title="Đăng xuất">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
