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
export default function MatchCard({ match, usingLocal, setMatches }) {
  const { isAdmin } = useAuth();
  
  // Admin Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editStatus, setEditStatus] = useState(match.status);
  const [editScoreA, setEditScoreA] = useState(match.scoreA ?? "");
  const [editScoreB, setEditScoreB] = useState(match.scoreB ?? "");
  const [editForceUnlocked, setEditForceUnlocked] = useState(match.forceUnlocked || false);
  const [saving, setSaving] = useState(false);

  const formatDate = (date) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return "Chưa xác định";
      return d.toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "Chưa xác định";
    }
  };

  const formatTime = (date) => {
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) return "--:--";
      return d.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "--:--";
    }
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

      if (usingLocal) {
        if (setMatches) {
          setMatches((currentMatches) =>
            currentMatches.map((m) => {
              if (m.id !== match.id) return m;

              let calculatedResult = null;
              if (editStatus === "finished") {
                if (sA > sB) calculatedResult = "teamA";
                else if (sA < sB) calculatedResult = "teamB";
                else calculatedResult = "draw";
              }

              return {
                ...m,
                status: editStatus,
                scoreA: sA,
                scoreB: sB,
                result: calculatedResult,
                forceUnlocked: editForceUnlocked,
              };
            })
          );
        }
        setIsEditing(false);
        setSaving(false);
        return;
      }

      const matchRef = doc(db, "matches", match.id);
      
      // 1. Cập nhật trận đấu trong Firestore
      await updateDoc(matchRef, {
        status: editStatus,
        scoreA: sA,
        scoreB: sB,
        result: result,
        forceUnlocked: editForceUnlocked
      });

      // 2. Nếu trạng thái chuyển sang kết thúc, xử lý điểm bình chọn cho người dùng
      if (editStatus === "finished" && result) {
        const votesQuery = query(collection(db, "votes"), where("matchId", "==", match.id));
        const votesSnapshot = await getDocs(votesQuery);
        const usersSnapshot = await getDocs(collection(db, "users"));
        const votedUserIds = new Set();
        const batch = writeBatch(db);

        if (!votesSnapshot.empty) {
          for (const voteDoc of votesSnapshot.docs) {
            const voteData = voteDoc.data();
            const isCorrect = voteData.vote === result;
            const wasCorrect = voteData.isCorrect; // true, false, hoặc null
            votedUserIds.add(voteData.userId);

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
        }

        // Đối với những người chưa bình chọn: cộng 1 điểm sai (nếu trận đấu trước đó chưa kết thúc)
        // Chỉ áp dụng từ trận Qatar vs Thụy Sĩ (2026-06-14T02:00:00+07:00)
        // Và chỉ áp dụng cho người chơi (không tính Admin) có ngày đăng ký <= giờ kickoff
        const thresholdDate = new Date("2026-06-14T02:00:00+07:00");
        const kickoff = match.matchDate?.toDate ? match.matchDate.toDate() : new Date(match.matchDate);
        const isAfterThreshold = kickoff >= thresholdDate;

        if (match.status !== "finished" && isAfterThreshold) {
          for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const isPlayer = userData.isAdmin !== true;
            const userCreatedAt = userData.createdAt?.toDate 
              ? userData.createdAt.toDate() 
              : (userData.createdAt ? new Date(userData.createdAt) : new Date(0));
            
            const wasCreatedBeforeKickoff = userCreatedAt <= kickoff;

            if (isPlayer && !votedUserIds.has(userDoc.id) && wasCreatedBeforeKickoff) {
              const userRef = doc(db, "users", userDoc.id);
              batch.update(userRef, {
                totalPredictions: increment(1)
              });
            }
          }
        }

        await batch.commit();
      }

      // 3. Nếu trạng thái trước đó là finished nhưng giờ hoàn tác về live/upcoming
      if (match.status === "finished" && editStatus !== "finished") {
        const votesQuery = query(collection(db, "votes"), where("matchId", "==", match.id));
        const votesSnapshot = await getDocs(votesQuery);
        const usersSnapshot = await getDocs(collection(db, "users"));
        const votedUserIds = new Set();
        const batch = writeBatch(db);

        if (!votesSnapshot.empty) {
          for (const voteDoc of votesSnapshot.docs) {
            const voteData = voteDoc.data();
            const wasCorrect = voteData.isCorrect;
            votedUserIds.add(voteData.userId);

            if (wasCorrect !== undefined && wasCorrect !== null) {
              batch.update(voteDoc.ref, { isCorrect: null });

              const userRef = doc(db, "users", voteData.userId);
              batch.update(userRef, {
                correctPredictions: increment(wasCorrect ? -1 : 0),
                totalPredictions: increment(-1)
              });
            }
          }
        }

        // Đối với những người chưa bình chọn: hoàn tác điểm sai (trừ 1 ở totalPredictions)
        // Chỉ áp dụng từ trận Qatar vs Thụy Sĩ (2026-06-14T02:00:00+07:00)
        // Và chỉ áp dụng cho người chơi (không tính Admin) có ngày đăng ký <= giờ kickoff
        const thresholdDate = new Date("2026-06-14T02:00:00+07:00");
        const kickoff = match.matchDate?.toDate ? match.matchDate.toDate() : new Date(match.matchDate);
        const isAfterThreshold = kickoff >= thresholdDate;

        if (isAfterThreshold) {
          for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const isPlayer = userData.isAdmin !== true;
            const userCreatedAt = userData.createdAt?.toDate 
              ? userData.createdAt.toDate() 
              : (userData.createdAt ? new Date(userData.createdAt) : new Date(0));
            
            const wasCreatedBeforeKickoff = userCreatedAt <= kickoff;

            if (isPlayer && !votedUserIds.has(userDoc.id) && wasCreatedBeforeKickoff) {
              const userRef = doc(db, "users", userDoc.id);
              batch.update(userRef, {
                totalPredictions: increment(-1)
              });
            }
          }
        }

        await batch.commit();
      }

      setIsEditing(false);
    } catch (err) {
      console.error("Lỗi khi cập nhật trận đấu:", err);
      alert("Lỗi khi cập nhật: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetVotes = async () => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn hủy toàn bộ lượt bình chọn của trận đấu này? Thao tác này sẽ xóa sạch tất cả bình chọn và cập nhật lại điểm số người chơi tương ứng."
      )
    )
      return;
    setSaving(true);
    try {
      if (usingLocal) {
        if (setMatches) {
          setMatches((currentMatches) =>
            currentMatches.map((m) => {
              if (m.id !== match.id) return m;
              return {
                ...m,
                votes: {
                  teamA: 0,
                  draw: 0,
                  teamB: 0,
                  total: 0,
                },
              };
            })
          );
        }
        setIsEditing(false);
        setSaving(false);
        alert("Đã reset toàn bộ bình chọn của trận đấu này thành công!");
        return;
      }

      const votesQuery = query(
        collection(db, "votes"),
        where("matchId", "==", match.id)
      );
      const votesSnapshot = await getDocs(votesQuery);

      const batch = writeBatch(db);

      if (!votesSnapshot.empty) {
        for (const voteDoc of votesSnapshot.docs) {
          const voteData = voteDoc.data();
          const wasCorrect = voteData.isCorrect;

          // Xóa tài liệu vote
          batch.delete(voteDoc.ref);

          // Nếu kết quả đã được tính điểm, hoàn tác điểm cho user
          if (wasCorrect !== undefined && wasCorrect !== null) {
            const userRef = doc(db, "users", voteData.userId);
            batch.update(userRef, {
              correctPredictions: increment(wasCorrect ? -1 : 0),
              totalPredictions: increment(-1),
            });
          }
        }
      }

      // Cập nhật lại votes của match về 0
      const matchRef = doc(db, "matches", match.id);
      batch.update(matchRef, {
        votes: {
          teamA: 0,
          draw: 0,
          teamB: 0,
          total: 0,
        },
      });

      await batch.commit();
      alert("Đã reset toàn bộ bình chọn của trận đấu này thành công!");
      setIsEditing(false);
    } catch (err) {
      console.error("Lỗi khi reset bình chọn:", err);
      alert("Lỗi khi reset bình chọn: " + err.message);
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
                const kickoff = match.matchDate?.toDate ? match.matchDate.toDate() : new Date(match.matchDate);
                const hasEnded = new Date() >= new Date(kickoff.getTime() + 2 * 60 * 60 * 1000);
                
                setEditStatus(hasEnded ? "finished" : match.status);
                setEditScoreA(match.scoreA ?? "");
                setEditScoreB(match.scoreB ?? "");
                setEditForceUnlocked(match.forceUnlocked || false);
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

          <div className="form-group admin-checkbox-group">
            <input
              type="checkbox"
              id={`forceUnlocked-${match.id}`}
              checked={editForceUnlocked}
              onChange={(e) => setEditForceUnlocked(e.target.checked)}
              className="admin-checkbox"
            />
            <label className="checkbox-label" htmlFor={`forceUnlocked-${match.id}`}>
              🔓 Mở khóa bình chọn (Cho phép vote quá giờ)
            </label>
          </div>

          <div className="admin-panel-actions">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditStatus(match.status);
                setEditScoreA(match.scoreA ?? "");
                setEditScoreB(match.scoreB ?? "");
                setEditForceUnlocked(match.forceUnlocked || false);
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
            <button
              type="button"
              onClick={handleResetVotes}
              disabled={saving}
              className="login-btn admin-btn-reset"
            >
              🔄 Reset
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
          <VoteWidget match={match} usingLocal={usingLocal} />
        </>
      )}
    </div>
  );
}
