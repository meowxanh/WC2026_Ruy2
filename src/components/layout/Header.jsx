import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const navItems = useMemo(() => {
    const items = [
      { path: "/", label: "Trận đấu", icon: "⚽" },
      { path: "/leaderboard", label: "Bảng xếp hạng", icon: "🏆" },
    ];
    if (user && isAdmin) {
      items.push({ path: "/admin/create-account", label: "Tạo tài khoản", icon: "👤" });
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

        {/* User info */}
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
    </header>
  );
}
