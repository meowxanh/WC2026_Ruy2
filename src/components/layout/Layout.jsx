import { Outlet } from "react-router-dom";
import Header from "./Header";
import BackToTop from "./BackToTop";

export default function Layout() {
  return (
    <div className="app-layout">
      <Header />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="app-footer">
        <p>
          ⚽ WC 2026 Prediction &mdash; Bình chọn & Dự đoán World Cup 2026
        </p>
      </footer>
      <BackToTop />
    </div>
  );
}
