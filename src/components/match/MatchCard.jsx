import { useState } from "react";
import { doc, updateDoc, collection, query, where, getDocs, writeBatch, increment } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import VoteWidget from "./VoteWidget";

/**
 * Card hiển thị thông tin một trận đấu.
 * Bao gồm: Cờ quốc gia, tên đội, tỷ số, thời gian, và VoteWidget.
 * Tích hợp bảng điều khiển cập nhật kết quả cho Admin.
 */
export default function MatchCard({ match }) {
  const { isAdmin } = useAuth();
  
  // Admin Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState(match.status);
  const [editScoreA, setEditScoreA] = useState(match.scoreA ?? "");
  const [editScoreB, setEditScoreB] = useState(match.scoreB ?? "");
  const [saving, setSaving] = useState(false);

  const formatDate = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getStatusBadge = () => {
    switch (match.status) {
      case "live":
        return <span className="badge badge--live">🔴 LIVE</span>;
      case "finished":
        return <span className="badge badge--finished">Kết thúc</span>;
      default:
        return <span className="badge badge--upcoming">Sắp diễn ra</span>;
    }
  };

  const getResultLabel = () => {
    if (match.status !== "finished" || !match.result) return null;
    switch (match.result) {
      case "teamA":
        return match.teamA.name + " thắng";
      case "teamB":
        return match.teamB.name + " thắng";
      case "draw":
        return "Hòa";
      default:
        return null;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let result = null;
      let sA = editScoreA !== "" ? parseInt(editScoreA) : null;
      let sB = editScoreB !== "" ? parseInt(editScoreB) : null;

      if (editStatus === "finished") {
        if (sA === null || sB === null) {
          alert("Vui lòng nhập tỷ số khi trận đấu đã kết thúc.");
          setSaving(false);
          return;
        }
        if (sA > sB) result = "teamA";
        else if (sA < sB) result = "teamB";
        else result = "draw";
      } else if (editStatus === "live") {
        if (sA === null) sA = 0;
        if (sB === null) sB = 0;
      } else {
        // upcoming
        sA = null;
        sB = null;
        result = null;
      }

      const matchRef = doc(db, "matches", match.id);
      
      // 1. Cập nhật trận đấu trong Firestore
      await updateDoc(matchRef, {
        status: editStatus,
        scoreA: sA,
        scoreB: sB,
        result: result
      });

      // 2. Nếu trạng thái chuyển sang kết thúc, xử lý điểm bình chọn cho người dùng
      if (editStatus === "finished" && result) {
        const votesQuery = query(collection(db, "votes"), where("matchId", "==", match.id));
        const votesSnapshot = await getDocs(votesQuery);

        if (!votesSnapshot.empty) {
          const batch = writeBatch(db);

          for (const voteDoc of votesSnapshot.docs) {
            const voteData = voteDoc.data();
            const isCorrect = voteData.vote === result;
            const wasCorrect = voteData.isCorrect; // true, false, hoặc null

            // Cập nhật kết quả dự đoán
            batch.update(voteDoc.ref, { isCorrect });

            // Tính toán hiệu số điểm
            let correctInc = 0;
            let totalInc = 0;

            if (wasCorrect === undefined || wasCorrect === null) {
              totalInc = 1;
              if (isCorrect) correctInc = 1;
            } else {
              if (wasCorrect && !isCorrect) {
                correctInc = -1;
              } else if (!wasCorrect && isCorrect) {
                correctInc = 1;
              }
            }

            const userRef = doc(db, "users", voteData.userId);
            batch.update(userRef, {
              correctPredictions: increment(correctInc),
              totalPredictions: increment(totalInc)
            });
          }

          await batch.commit();
        }
      }

      // 3. Nếu trạng thái trước đó là finished nhưng giờ hoàn tác về live/upcoming
      if (match.status === "finished" && editStatus !== "finished") {
        const votesQuery = query(collection(db, "votes"), where("matchId", "==", match.id));
        const votesSnapshot = await getDocs(votesQuery);

        if (!votesSnapshot.empty) {
          const batch = writeBatch(db);

          for (const voteDoc of votesSnapshot.docs) {
            const voteData = voteDoc.data();
            const wasCorrect = voteData.isCorrect;

            if (wasCorrect !== undefined && wasCorrect !== null) {
              batch.update(voteDoc.ref, { isCorrect: null });

              const userRef = doc(db, "users", voteData.userId);
              batch.update(userRef, {
                correctPredictions: increment(wasCorrect ? -1 : 0),
                totalPredictions: increment(-1)
              });
            }
          }

          await batch.commit();
        }
      }

      setIsEditing(false);
    } catch (err) {
      console.error("Lỗi khi cập nhật trận đấu:", err);
      alert("Lỗi khi cập nhật: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`match-card ${match.status === "live" ? "match-card--live" : ""} ${isEditing ? "match-card--editing" : ""}`}>
      {/* Header: Group + Status */}
      <div className="match-card-header">
        <span className="match-group">{match.group}</span>
        <div className="match-header-actions">
          {getStatusBadge()}
          {isAdmin && !isEditing && (
            <button
              onClick={() => {
                setEditStatus(match.status);
                setEditScoreA(match.scoreA ?? "");
                setEditScoreB(match.scoreB ?? "");
                setIsEditing(true);
              }}
              className="admin-edit-btn"
              title="Cập nhật trận đấu"
            >
              🔧 Cập nhật
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="admin-edit-panel">
          <div className="form-group">
            <label className="form-label" htmlFor={`status-${match.id}`}>Trạng thái</label>
            <select
              id={`status-${match.id}`}
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="form-input"
            >
              <option value="upcoming">Sắp diễn ra</option>
              <option value="live">Đang diễn ra (LIVE)</option>
              <option value="finished">Đã kết thúc</option>
            </select>
          </div>

          {editStatus !== "upcoming" && (
            <div className="admin-score-inputs">
              <div className="form-group">
                <label className="form-label" htmlFor={`scoreA-${match.id}`}>{match.teamA.name}</label>
                <input
                  type="number"
                  id={`scoreA-${match.id}`}
                  min="0"
                  value={editScoreA}
                  onChange={(e) => setEditScoreA(e.target.value)}
                  placeholder="0"
                  className="form-input"
                  required
                />
              </div>
              <div className="admin-score-separator">:</div>
              <div className="form-group">
                <label className="form-label" htmlFor={`scoreB-${match.id}`}>{match.teamB.name}</label>
                <input
                  type="number"
                  id={`scoreB-${match.id}`}
                  min="0"
                  value={editScoreB}
                  onChange={(e) => setEditScoreB(e.target.value)}
                  placeholder="0"
                  className="form-input"
                  required
                />
              </div>
            </div>
          )}

          <div className="admin-panel-actions">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditStatus(match.status);
                setEditScoreA(match.scoreA ?? "");
                setEditScoreB(match.scoreB ?? "");
              }}
              disabled={saving}
              className="login-btn admin-btn-cancel"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="login-btn admin-btn-save"
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Teams section */}
          <div className="match-teams">
            {/* Team A */}
            <div className={`match-team ${match.result === "teamA" ? "match-team--winner" : ""}`}>
              <img
                src={match.teamA.flag}
                alt={match.teamA.name}
                className="team-flag"
                loading="lazy"
              />
              <span className="team-name">{match.teamA.name}</span>
            </div>

            {/* Score / VS */}
            <div className="match-score-area">
              {match.status === "finished" || match.status === "live" ? (
                <div className="match-score">
                  <span className="score-num">{match.scoreA ?? "-"}</span>
                  <span className="score-separator">:</span>
                  <span className="score-num">{match.scoreB ?? "-"}</span>
                </div>
              ) : (
                <div className="match-vs">VS</div>
              )}
            </div>

            {/* Team B */}
            <div className={`match-team ${match.result === "teamB" ? "match-team--winner" : ""}`}>
              <img
                src={match.teamB.flag}
                alt={match.teamB.name}
                className="team-flag"
                loading="lazy"
              />
              <span className="team-name">{match.teamB.name}</span>
            </div>
          </div>

          {/* Match result label */}
          {getResultLabel() && (
            <div className="match-result-label">🏆 {getResultLabel()}</div>
          )}

          {/* Match info */}
          <div className="match-info">
            <span className="match-datetime">
              📅 {formatDate(match.matchDate)} &bull; 🕐 {formatTime(match.matchDate)}
            </span>
            <span className="match-venue">📍 {match.venue}</span>
          </div>

          {/* Vote widget */}
          <VoteWidget match={match} />
        </>
      )}
    </div>
  );
}
