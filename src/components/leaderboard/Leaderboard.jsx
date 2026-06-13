import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";

const MEDAL_ICONS = ["🥇", "🥈", "🥉"];

/**
 * Bảng xếp hạng top 20 người dự đoán đúng nhiều nhất.
 * Sử dụng Firestore real-time listener.
 * Fallback dữ liệu mẫu khi chưa có Firestore.
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
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingLocal, setUsingLocal] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  const handleRecalculateLeaderboard = async () => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn tính toán lại toàn bộ điểm số của tất cả người chơi dựa trên các trận đấu đã kết thúc? Thao tác này sẽ đồng bộ lại BXH."
      )
    )
      return;
    setRecalculating(true);
    try {
      // 1. Get all matches
      const matchesSnapshot = await getDocs(collection(db, "matches"));
      const finishedMatches = {}; // matchId -> { result, kickoff }
      matchesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.status === "finished" && data.result) {
          const kickoff = data.matchDate?.toDate ? data.matchDate.toDate() : new Date(data.matchDate);
          finishedMatches[doc.id] = { result: data.result, kickoff };
        }
      });

      // 2. Get all votes
      const votesSnapshot = await getDocs(collection(db, "votes"));

      // 3. Get all users
      const usersSnapshot = await getDocs(collection(db, "users"));
      const userScores = {}; // userId -> { correct: 0, total: 0 }
      const userCreatedDates = {}; // userId -> Date

      // Initialize only player users (exclude admins)
      usersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const isPlayer = data.isAdmin !== true;
        if (isPlayer) {
          userScores[doc.id] = { correct: 0, total: 0 };
          userCreatedDates[doc.id] = data.createdAt?.toDate 
            ? data.createdAt.toDate() 
            : (data.createdAt ? new Date(data.createdAt) : new Date(0));
        }
      });

      const batch = writeBatch(db);
      const userVotesMap = {}; // userId -> Set of matchIds voted

      // 4. Calculate scores based on votes actually cast
      for (const voteDoc of votesSnapshot.docs) {
        const voteData = voteDoc.data();
        const matchInfo = finishedMatches[voteData.matchId];

        // Skip if user is admin (they won't be in userScores)
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

          if (voteData.isCorrect !== isCorrect) {
            batch.update(voteDoc.ref, { isCorrect: isCorrect });
          }
        } else {
          if (voteData.isCorrect !== null && voteData.isCorrect !== undefined) {
            batch.update(voteDoc.ref, { isCorrect: null });
          }
        }
      }

      // Add non-voter penalties (+1 total) for finished matches starting from Qatar vs Switzerland (2026-06-14T02:00:00+07:00)
      // and only where user was registered before the match kickoff
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

      // 5. Update users in Firestore (Reset admins to 0, update players)
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
      alert("Lỗi khi cập nhật: " + err.message);
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    let unsubscribe;
    try {
      const q = query(
        collection(db, "users"),
        orderBy("correctPredictions", "desc"),
        limit(20)
      );
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            setUsers(sampleLeaderboard);
            setUsingLocal(true);
          } else {
            const data = snapshot.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .filter((u) => u.totalPredictions > 0 && u.isAdmin !== true);
            setUsers(data.length > 0 ? data : sampleLeaderboard);
            setUsingLocal(data.length === 0);
          }
          setLoading(false);
        },
        () => {
          setUsers(sampleLeaderboard);
          setUsingLocal(true);
          setLoading(false);
        }
      );
    } catch {
      setUsers(sampleLeaderboard);
      setUsingLocal(true);
      setLoading(false);
    }
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    if (isAdmin && !usingLocal && users.length > 0) {
      const autoRecalculate = async () => {
        try {
          const matchesSnapshot = await getDocs(collection(db, "matches"));
          const finishedMatches = {}; // matchId -> { result, kickoff }
          matchesSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            if (data.status === "finished" && data.result) {
              const kickoff = data.matchDate?.toDate ? data.matchDate.toDate() : new Date(data.matchDate);
              finishedMatches[doc.id] = { result: data.result, kickoff };
            }
          });

          const votesSnapshot = await getDocs(collection(db, "votes"));
          const usersSnapshot = await getDocs(collection(db, "users"));
          const userScores = {};
          const userCreatedDates = {};

          // Initialize only player users (exclude admins)
          usersSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            const isPlayer = data.isAdmin !== true;
            if (isPlayer) {
              userScores[doc.id] = { correct: 0, total: 0 };
              userCreatedDates[doc.id] = data.createdAt?.toDate 
                ? data.createdAt.toDate() 
                : (data.createdAt ? new Date(data.createdAt) : new Date(0));
            }
          });

          const batch = writeBatch(db);
          let needsUpdate = false;
          const userVotesMap = {}; // userId -> Set of matchIds voted

          for (const voteDoc of votesSnapshot.docs) {
            const voteData = voteDoc.data();
            const matchInfo = finishedMatches[voteData.matchId];

            // Skip if user is admin
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

              if (voteData.isCorrect !== isCorrect) {
                batch.update(voteDoc.ref, { isCorrect: isCorrect });
                needsUpdate = true;
              }
            } else {
              if (voteData.isCorrect !== null && voteData.isCorrect !== undefined) {
                batch.update(voteDoc.ref, { isCorrect: null });
                needsUpdate = true;
              }
            }
          }

          // Add non-voter penalties
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

          // Update users in Firestore
          for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            const computed = userScores[userId] || { correct: 0, total: 0 };
            
            if (
              userData.correctPredictions !== computed.correct ||
              userData.totalPredictions !== computed.total
            ) {
              const userRef = doc(db, "users", userId);
              batch.update(userRef, {
                correctPredictions: computed.correct,
                totalPredictions: computed.total,
              });
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            await batch.commit();
            console.log("Leaderboard scores automatically synced and updated!");
          }
        } catch (err) {
          console.error("Error auto-recalculating leaderboard:", err);
        }
      };
      autoRecalculate();
    }
  }, [isAdmin, usingLocal, users.length]);

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
