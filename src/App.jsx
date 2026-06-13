import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/layout/Layout";
import Login from "./components/auth/Login";
import MatchList from "./components/match/MatchList";
import Leaderboard from "./components/leaderboard/Leaderboard";
import AdminCreateAccount from "./components/admin/AdminCreateAccount";
import AdminAddMatch from "./components/admin/AdminAddMatch";
import ChangePassword from "./components/auth/ChangePassword";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="match-list-loading">
        <div className="spinner"></div>
        <p>Đang kiểm tra đăng nhập...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="match-list-loading">
        <div className="spinner"></div>
        <p>Đang kiểm tra quyền Admin...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<MatchList />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route
          path="/admin/create-account"
          element={
            <AdminRoute>
              <AdminCreateAccount />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/add-match"
          element={
            <AdminRoute>
              <AdminAddMatch />
            </AdminRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  );
}
