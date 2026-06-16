import { useEffect, useState, useMemo } from "react";
import {
  collection,
  onSnapshot,
  getDocs,
  doc,
  writeBatch,
  query,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useMatches } from "../../hooks/useMatches";

const MEDAL_ICONS = ["🥇", "🥈", "🥉"];

/**
 * Bảng xếp hạng top 20 người dự đoán đúng nhiều nhất.
 * Tính toán động client-side để hiển thị tuyệt đối chính xác 100%, bảo vệ Firestore quota.
 */

const sampleLeaderboard = [
  { id: "1", displayName: "Nguyễn Văn A", photoURL: null, correctPredictions: 8, totalPredictions: 10 },
  { id: "2", displayName: "Trần Thị B", photoURL: null, correctPredictions: 7, totalPredictions: 10 },
  { id: "3", displayName: "Lê Hoàng C", photoURL: null, correctPredictions: 7, totalPredictions: 12 },
  { id: "4", displayName: "Phạm Minh D", photoURL: null, correctPredictions: 6, totalPredictions: 10 },
  { id: "5", displayName: "Hoàng Anh E", photoURL: null, correctPredictions: 5, totalPredictions: 8 },
  { id: "6", displayName: "Vũ Đức F", photoURL: null, correctPredictions: 5, totalPredictions: 10 },
  { id: "7", displayName: "Đỗ Thanh G", photoURL: null, correctPredictions: 4, totalPredictions: 9 },
  { id: "8", displayName: "Bùi Quang H", photoURL: null, correctPredictions: 4, totalPredictions: 10 },
];

export default function Leaderboard() {
  const { isAdmin } = useAuth();
  const { matches: hookMatches, loading: loadingMatches, usingLocal: matchesUsingLocal } = useMatches();
  const [dbUsers, setDbUsers] = useState([]);
  const [dbVotes, setDbVotes] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingVotes, setLoadingVotes] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // 1. Listen to users collection in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setDbUsers(list);
        setLoadingUsers(false);
      },
      () => {
        setDbUsers([]);
        setLoadingUsers(false);
      }
    );
    return unsubscribe;
  }, []);

  // 2. Listen to votes collection in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "votes"),
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setDbVotes(list);
        setLoadingVotes(false);
      },
      () => {
        setDbVotes([]);
        setLoadingVotes(false);
      }
    );
    return unsubscribe;
  }, []);

  const usingLocal = matchesUsingLocal || dbUsers.length === 0;
  const loading = loadingMatches || loadingUsers || loadingVotes;

  // 3. Calculate leaderboard dynamically client-side in real-time
  const users = useMemo(() => {
    if (usingLocal) {
      return sampleLeaderboard;
    }

    // A. Map finished matches and results dynamically
    const finishedMatches = {};
    hookMatches.forEach((m) => {
      // Matches are already processed by useMatches hook, so status & result are dynamic
      if (m.status === "finished" && m.result) {
        const kickoff = m.matchDate?.toDate ? m.matchDate.toDate() : new Date(m.matchDate);
        finishedMatches[m.id] = { result: m.result, kickoff };
      }
    });

    // B. Group votes by user
    const userVotesMap = {};
    dbVotes.forEach((v) => {
      if (!userVotesMap[v.userId]) {
        userVotesMap[v.userId] = {};
      }
      userVotesMap[v.userId][v.matchId] = v.vote;
    });

    // C. Calculate scores (only players, exclude admins)
    const thresholdDate = new Date("2026-06-14T02:00:00+07:00");
    
    const playersList = dbUsers
      .filter((u) => u.isAdmin !== true)
      .map((u) => {
        let correct = 0;
        let total = 0;
        const votesCast = userVotesMap[u.id] || {};
        const userCreated = u.createdAt?.toDate 
          ? u.createdAt.toDate() 
          : (u.createdAt ? new Date(u.createdAt) : new Date(0));

        Object.keys(finishedMatches).forEach((matchId) => {
          const matchInfo = finishedMatches[matchId];
          const voted = votesCast[matchId];

          if (voted) {
            total += 1;
            if (voted === matchInfo.result) {
              correct += 1;
            }
          } else {
            // Check if they are eligible for non-voter penalty
            const isAfterThreshold = matchInfo.kickoff >= thresholdDate;
            const wasCreatedBeforeKickoff = userCreated <= matchInfo.kickoff;

            if (isAfterThreshold && wasCreatedBeforeKickoff) {
              total += 1;
            }
          }
        });

        return {
          ...u,
          correctPredictions: correct,
          totalPredictions: total,
        };
      })
      .filter((u) => u.totalPredictions > 0);

    // Sort: most correct predictions first, then highest win rate (totalPredictions asc)
    return playersList.sort((a, b) => {
      if (b.correctPredictions !== a.correctPredictions) {
        return b.correctPredictions - a.correctPredictions;
      }
      return a.totalPredictions - b.totalPredictions;
    });
  }, [dbUsers, hookMatches, dbVotes, usingLocal]);

  // Recalculate button remains for Admin to push manual updates to Firestore, with safety checks for quota exceeded
  const handleRecalculateLeaderboard = async () => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn tính toán lại toàn bộ điểm số của tất cả người chơi dựa trên các trận đấu đã kết thúc? Thao tác này sẽ đồng bộ lại BXH."
      )
    )
      return;
    setRecalculating(true);
    try {
      const matchesSnapshot = await getDocs(collection(db, "matches"));
      const finishedMatches = {};
      matchesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const kickoff = data.matchDate?.toDate ? data.matchDate.toDate() : new Date(data.matchDate);
        const twoHours = 2 * 60 * 60 * 1000;
        const hasEnded = new Date() >= new Date(kickoff.getTime() + twoHours);
        const isFinished = data.status === "finished" || (hasEnded && data.scoreA !== null && data.scoreB !== null && data.scoreA !== undefined && data.scoreB !== undefined);

        if (isFinished) {
          let result = data.result;
          if (!result && data.scoreA !== null && data.scoreB !== null) {
            const sA = parseInt(data.scoreA);
            const sB = parseInt(data.scoreB);
            if (sA > sB) result = "teamA";
            else if (sA < sB) result = "teamB";
            else result = "draw";
          }
          if (result) {
            finishedMatches[doc.id] = { result, kickoff };
          }
        }
      });

      const votesSnapshot = await getDocs(collection(db, "votes"));
      const usersSnapshot = await getDocs(collection(db, "users"));
      const userScores = {};
      const userCreatedDates = {};

      usersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.isAdmin !== true) {
          userScores[doc.id] = { correct: 0, total: 0 };
          userCreatedDates[doc.id] = data.createdAt?.toDate 
            ? data.createdAt.toDate() 
            : (data.createdAt ? new Date(data.createdAt) : new Date(0));
        }
      });

      const batch = writeBatch(db);
      const userVotesMap = {};

      for (const voteDoc of votesSnapshot.docs) {
        const voteData = voteDoc.data();
        const matchInfo = finishedMatches[voteData.matchId];

        if (!userScores[voteData.userId]) continue;

        if (!userVotesMap[voteData.userId]) {
          userVotesMap[voteData.userId] = new Set();
        }
        userVotesMap[voteData.userId].add(voteData.matchId);

        if (matchInfo) {
          const isCorrect = voteData.vote === matchInfo.result;
          userScores[voteData.userId].total += 1;
          if (isCorrect) {
            userScores[voteData.userId].correct += 1;
          }
          if (voteDoc.data().isCorrect !== isCorrect) {
            batch.update(voteDoc.ref, { isCorrect });
          }
        } else {
          if (voteDoc.data().isCorrect !== null && voteDoc.data().isCorrect !== undefined) {
            batch.update(voteDoc.ref, { isCorrect: null });
          }
        }
      }

      const thresholdDate = new Date("2026-06-14T02:00:00+07:00");
      for (const userId of Object.keys(userScores)) {
        const userCreated = userCreatedDates[userId];
        const votedMatches = userVotesMap[userId] || new Set();

        for (const matchId of Object.keys(finishedMatches)) {
          if (!votedMatches.has(matchId)) {
            const matchInfo = finishedMatches[matchId];
            const isAfterThreshold = matchInfo.kickoff >= thresholdDate;
            const wasCreatedBeforeKickoff = userCreated <= matchInfo.kickoff;

            if (isAfterThreshold && wasCreatedBeforeKickoff) {
              userScores[userId].total += 1;
            }
          }
        }
      }

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userRef = doc(db, "users", userId);
        if (userScores[userId]) {
          batch.update(userRef, {
            correctPredictions: userScores[userId].correct,
            totalPredictions: userScores[userId].total,
          });
        } else {
          batch.update(userRef, {
            correctPredictions: 0,
            totalPredictions: 0,
          });
        }
      }

      await batch.commit();
      alert("Cập nhật lại bảng xếp hạng thành công!");
    } catch (err) {
      console.error("Lỗi khi cập nhật BXH:", err);
      if (err.message.includes("quota") || err.message.includes("EXHAUSTED")) {
        alert("Hiện tại giới hạn ghi của cơ sở dữ liệu Firebase (Spark Plan) đã đạt ngưỡng tối đa hôm nay, dữ liệu trên Firestore tạm thời chưa được lưu. Tuy nhiên, bảng xếp hạng trên trình duyệt của bạn đã được hệ thống tự động tính toán động và hiển thị chính xác hoàn toàn!");
      } else {
        alert("Lỗi khi cập nhật: " + err.message);
      }
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="match-list-loading">
        <div className="spinner"></div>
        <p>Đang tải bảng xếp hạng...</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <div className="page-hero">
        <h1 className="page-title">
          <span className="title-icon">🏆</span>
          Bảng Xếp Hạng
          <span className="title-icon">🏆</span>
        </h1>
        <p className="page-description">
          Top những người dự đoán chính xác nhất World Cup 2026
        </p>
      </div>

      {isAdmin && !usingLocal && (
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <button
            onClick={handleRecalculateLeaderboard}
            disabled={recalculating}
            className="login-btn"
            style={{
              background: "var(--gradient-primary)",
              color: "#0a0e1a",
              border: "none",
              padding: "10px 20px",
              fontSize: "0.85rem",
              fontWeight: "600",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              width: "auto",
            }}
          >
            {recalculating ? "⏳ Đang tính toán..." : "🔄 Cập nhật lại điểm số"}
          </button>
        </div>
      )}

      {usingLocal && (
        <div className="local-data-notice">
          ⚠️ Đang sử dụng dữ liệu mẫu. Cấu hình Firebase để có dữ liệu thực.
        </div>
      )}

      <div className="leaderboard-table-wrapper">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="lb-th lb-th--rank">Hạng</th>
              <th className="lb-th lb-th--user">Người chơi</th>
              <th className="lb-th lb-th--correct">Đúng</th>
              <th className="lb-th lb-th--wrong">Sai</th>
              <th className="lb-th lb-th--total">Tổng</th>
              <th className="lb-th lb-th--rate">Tỷ lệ</th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 && (() => {
              const totalCorrect = users.reduce((sum, u) => sum + (u.correctPredictions || 0), 0);
              const totalWrong = users.reduce((sum, u) => sum + ((u.totalPredictions || 0) - (u.correctPredictions || 0)), 0);
              const totalPredictions = users.reduce((sum, u) => sum + (u.totalPredictions || 0), 0);
              const averageRate = totalPredictions > 0 ? Math.round((totalCorrect / totalPredictions) * 100) : 0;
              
              return (
                <tr className="lb-row lb-row--total-sum">
                  <td className="lb-cell lb-cell--rank" style={{ color: "var(--accent-gold)" }}>Σ</td>
                  <td className="lb-cell lb-cell--user">
                    <div className="lb-avatar lb-avatar--placeholder">📊</div>
                    <span className="lb-name" style={{ color: "var(--accent-gold)" }}>Tổng cộng</span>
                  </td>
                  <td className="lb-cell lb-cell--correct" style={{ color: "var(--accent-green)", fontWeight: "bold" }}>
                    {totalCorrect}
                  </td>
                  <td className="lb-cell lb-cell--wrong" style={{ color: "var(--accent-red)", fontWeight: "bold" }}>
                    {totalWrong}
                  </td>
                  <td className="lb-cell lb-cell--total" style={{ fontWeight: "bold" }}>
                    {totalPredictions}
                  </td>
                  <td className="lb-cell lb-cell--rate">
                    <div className="lb-rate-bar">
                      <div
                        className="lb-rate-bar-fill"
                        style={{ width: `${averageRate}%`, background: "var(--gradient-primary)" }}
                      ></div>
                      <span className="lb-rate-text" style={{ fontWeight: "bold" }}>{averageRate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })()}
            {users.map((user, index) => {
              const rate =
                user.totalPredictions > 0
                  ? Math.round(
                      (user.correctPredictions / user.totalPredictions) * 100
                    )
                  : 0;
              const isTop3 = index < 3;
              const wrongCount = (user.totalPredictions || 0) - (user.correctPredictions || 0);

              return (
                <tr
                  key={user.id}
                  className={`lb-row ${isTop3 ? `lb-row--top${index + 1}` : ""}`}
                >
                  <td className="lb-cell lb-cell--rank">
                    {isTop3 ? (
                      <span className="lb-medal">{MEDAL_ICONS[index]}</span>
                    ) : (
                      <span className="lb-rank-num">{index + 1}</span>
                    )}
                  </td>
                  <td className="lb-cell lb-cell--user">
                    <img
                      src={
                        user.photoURL ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}&background=f59e0b&color=0a0e1a&bold=true&size=40`
                      }
                      alt={user.displayName}
                      className="lb-avatar"
                      referrerPolicy="no-referrer"
                    />
                    <span className="lb-name">{user.displayName}</span>
                  </td>
                  <td className="lb-cell lb-cell--correct">
                    {user.correctPredictions}
                  </td>
                  <td className="lb-cell lb-cell--wrong">
                    {wrongCount}
                  </td>
                  <td className="lb-cell lb-cell--total">
                    {user.totalPredictions}
                  </td>
                  <td className="lb-cell lb-cell--rate">
                    <div className="lb-rate-bar">
                      <div
                        className="lb-rate-bar-fill"
                        style={{ width: `${rate}%` }}
                      ></div>
                      <span className="lb-rate-text">{rate}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
