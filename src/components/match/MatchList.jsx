import { useState, useMemo, useCallback, useEffect } from "react";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useMatches } from "../../hooks/useMatches";
import { seedMatches } from "../../data/seedMatches";
import MatchCard from "./MatchCard";

const FILTER_TABS = [
  { key: "all", label: "Tất cả", icon: "📋" },
  { key: "upcoming", label: "Sắp diễn ra", icon: "📅" },
  { key: "live", label: "Đang diễn ra", icon: "🔴" },
  { key: "finished", label: "Đã kết thúc", icon: "✅" },
];

export default function MatchList() {
  const { matches, loading, usingLocal } = useMatches();
  const [activeFilter, setActiveFilter] = useState("all");
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState(null); // "success" | "error"
  const [now, setNow] = useState(new Date());

  // Cập nhật thời gian thực tế mỗi 15 giây để tự động chuyển trạng thái trận đấu
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const processedMatches = useMemo(() => {
    return matches.map((m) => {
      // Nếu trạng thái trong DB đã là finished, giữ nguyên
      if (m.status === "finished") return m;

      const kickoff = m.matchDate?.toDate ? m.matchDate.toDate() : new Date(m.matchDate);
      let calculatedStatus = m.status;

      if (now < kickoff) {
        calculatedStatus = "upcoming";
      } else {
        const diffMs = now - kickoff;
        const diffMinutes = diffMs / (1000 * 60);

        if (diffMinutes < 120) { // Đang đá (LIVE) trong 120 phút kể từ kickoff
          calculatedStatus = "live";
        } else { // Sau 120 phút coi như đã kết thúc
          calculatedStatus = "finished";
        }
      }

      return {
        ...m,
        status: calculatedStatus,
      };
    });
  }, [matches, now]);

  const filteredMatches = useMemo(() => {
    if (activeFilter === "all") return processedMatches;
    return processedMatches.filter((m) => m.status === activeFilter);
  }, [processedMatches, activeFilter]);

  const counts = useMemo(() => {
    const c = { all: processedMatches.length, upcoming: 0, live: 0, finished: 0 };
    processedMatches.forEach((m) => {
      if (c[m.status] !== undefined) c[m.status]++;
    });
    return c;
  }, [processedMatches]);

  // Đẩy toàn bộ seed data lên Firestore
  const handleSeedFirestore = useCallback(async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      for (const match of seedMatches) {
        const { id, matchDate, ...rest } = match;
        await setDoc(doc(db, "matches", id), {
          ...rest,
          matchDate: Timestamp.fromDate(
            matchDate instanceof Date ? matchDate : new Date(matchDate)
          ),
        });
      }
      setSeedResult("success");
    } catch (err) {
      console.error("Seed error:", err);
      setSeedResult("error");
    }
    setSeeding(false);
  }, []);

  if (loading) {
    return (
      <div className="match-list-loading">
        <div className="spinner"></div>
        <p>Đang tải danh sách trận đấu...</p>
      </div>
    );
  }

  return (
    <div className="match-list-page">
      {/* Page header */}
      <div className="page-hero">
        <h1 className="page-title">
          <span className="title-icon">⚽</span>
          World Cup 2026
          <span className="title-icon">🏆</span>
        </h1>
        <p className="page-description">
          Lưu ý: Hoạt động dự đoán và bình chọn chỉ nhằm mục đích giải trí, nghiêm cấm mọi hình thức cá cược.
        </p>
      </div>

      {/* Notice khi dùng local data + nút seed */}
      {usingLocal && (
        <div className="local-data-notice">
          <span>📡 Đang dùng dữ liệu mẫu (offline).</span>
          {seedResult === "success" ? (
            <span className="seed-success">
              ✅ Đã đẩy {seedMatches.length} trận lên Firestore! Tải lại trang để xem.
            </span>
          ) : seedResult === "error" ? (
            <span className="seed-error">
              ❌ Lỗi khi đẩy dữ liệu. Kiểm tra Firestore rules / kết nối.
            </span>
          ) : (
            <button
              className="seed-btn"
              onClick={handleSeedFirestore}
              disabled={seeding}
            >
              {seeding ? "⏳ Đang đẩy..." : "🚀 Đẩy dữ liệu lên Firestore"}
            </button>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="filter-tabs">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`filter-tab ${activeFilter === tab.key ? "filter-tab--active" : ""}`}
            onClick={() => setActiveFilter(tab.key)}
          >
            <span className="filter-tab-icon">{tab.icon}</span>
            <span className="filter-tab-label">{tab.label}</span>
            <span className="filter-tab-count">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Match grid */}
      {filteredMatches.length === 0 ? (
        <div className="match-list-empty">
          <span className="empty-icon">🏟️</span>
          <p>Không có trận đấu nào trong mục này.</p>
        </div>
      ) : (
        <div className="match-grid">
          {filteredMatches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}
