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
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";

const MEDAL_ICONS = ["🥇", "🥈", "🥉"];

/**
 * Bảng xếp hạng top 20 người dự đoán đúng nhiều nhất.
 * Sử dụng Firestore real-time listener.
 * Fallback dữ liệu mẫu khi chưa có Firestore.
 */

const isPhase2Match = (groupName) => {
  if (!groupName) return false;
  const name = groupName.toLowerCase();
  return name.includes("16");
};

const isPhase3Match = (groupName) => {
  if (!groupName) return false;
  const name = groupName.toLowerCase();
  return name.includes("tứ kết");
};

const isPhase4Match = (groupName) => {
  if (!groupName) return false;
  const name = groupName.toLowerCase();
  return name.includes("bán kết");
};

const isPhase5Match = (groupName) => {
  if (!groupName) return false;
  const name = groupName.toLowerCase();
  return name.includes("chung kết") || name.includes("hạng ba");
};

const sampleLeaderboard = [
  { id: "1", displayName: "Nguyễn Văn A", photoURL: null, correctPredictions: 8, totalPredictions: 10, correctPredictionsPhase1: 5, totalPredictionsPhase1: 6, correctPredictionsPhase2: 2, totalPredictionsPhase2: 2, correctPredictionsPhase3: 1, totalPredictionsPhase3: 2 },
  { id: "2", displayName: "Trần Thị B", photoURL: null, correctPredictions: 7, totalPredictions: 10, correctPredictionsPhase1: 4, totalPredictionsPhase1: 6, correctPredictionsPhase2: 2, totalPredictionsPhase2: 2, correctPredictionsPhase3: 1, totalPredictionsPhase3: 2 },
  { id: "3", displayName: "Lê Hoàng C", photoURL: null, correctPredictions: 7, totalPredictions: 12, correctPredictionsPhase1: 4, totalPredictionsPhase1: 7, correctPredictionsPhase2: 2, totalPredictionsPhase2: 3, correctPredictionsPhase3: 1, totalPredictionsPhase3: 2 },
  { id: "4", displayName: "Phạm Minh D", photoURL: null, correctPredictions: 6, totalPredictions: 10, correctPredictionsPhase1: 4, totalPredictionsPhase1: 6, correctPredictionsPhase2: 1, totalPredictionsPhase2: 2, correctPredictionsPhase3: 1, totalPredictionsPhase3: 2 },
  { id: "5", displayName: "Hoàng Anh E", photoURL: null, correctPredictions: 5, totalPredictions: 8, correctPredictionsPhase1: 3, totalPredictionsPhase1: 5, correctPredictionsPhase2: 1, totalPredictionsPhase2: 2, correctPredictionsPhase3: 1, totalPredictionsPhase3: 1 },
  { id: "6", displayName: "Vũ Đức F", photoURL: null, correctPredictions: 5, totalPredictions: 10, correctPredictionsPhase1: 3, totalPredictionsPhase1: 6, correctPredictionsPhase2: 1, totalPredictionsPhase2: 2, correctPredictionsPhase3: 1, totalPredictionsPhase3: 2 },
  { id: "7", displayName: "Đỗ Thanh G", photoURL: null, correctPredictions: 4, totalPredictions: 9, correctPredictionsPhase1: 2, totalPredictionsPhase1: 5, correctPredictionsPhase2: 1, totalPredictionsPhase2: 2, correctPredictionsPhase3: 1, totalPredictionsPhase3: 2 },
  { id: "8", displayName: "Bùi Quang H", photoURL: null, correctPredictions: 4, totalPredictions: 10, correctPredictionsPhase1: 2, totalPredictionsPhase1: 6, correctPredictionsPhase2: 1, totalPredictionsPhase2: 2, correctPredictionsPhase3: 1, totalPredictionsPhase3: 2 },
];

export default function Leaderboard() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usingLocal, setUsingLocal] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [activeTab, setActiveTab] = useState("chung_cuoc"); // "chung_cuoc", "phase1", "phase2", "phase3"

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
      const finishedMatches = {}; // matchId -> { result, kickoff, group }
      const dbMatches = {}; // matchId -> match data
      matchesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        dbMatches[doc.id] = { id: doc.id, ...data };
        if (data.status === "finished" && data.result) {
          const kickoff = data.matchDate?.toDate ? data.matchDate.toDate() : new Date(data.matchDate);
          finishedMatches[doc.id] = { result: data.result, kickoff, group: data.group };
        }
      });

      // 2. Get all votes
      const votesSnapshot = await getDocs(collection(db, "votes"));

      // 3. Get all users
      const rawUsersSnapshot = await getDocs(collection(db, "users"));

      // Tự động xóa các tài khoản ẩn danh/không có tên và tất cả các vote liên quan
      const deleteBatch = writeBatch(db);
      let deletedCount = 0;
      for (const userDoc of rawUsersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const name = userData.displayName;
        if (userData.isAdmin !== true && (!name || name.trim() === "" || name === "Ẩn danh")) {
          deleteBatch.delete(userDoc.ref);
          deletedCount++;

          const qVotes = query(collection(db, "votes"), where("userId", "==", userId));
          const vSnap = await getDocs(qVotes);
          vSnap.forEach((voteDoc) => {
            deleteBatch.delete(voteDoc.ref);
          });
        }
      }
      if (deletedCount > 0) {
        await deleteBatch.commit();
        console.log(`Deleted ${deletedCount} anonymous users and their votes.`);
      }

      // Lấy lại danh sách user sạch sau khi đã xóa
      const usersSnapshot = await getDocs(collection(db, "users"));
      const userScores = {}; // userId -> { correct: 0, total: 0, correct1: 0, total1: 0, correct2: 0, total2: 0, correct3: 0, total3: 0, correct4: 0, total4: 0, correct5: 0, total5: 0 }
      const userCreatedDates = {}; // userId -> Date

      // Initialize only player users (exclude admins)
      usersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const isPlayer = data.isAdmin !== true;
        if (isPlayer) {
          userScores[doc.id] = { correct: 0, total: 0, correct1: 0, total1: 0, correct2: 0, total2: 0, correct3: 0, total3: 0, correct4: 0, total4: 0, correct5: 0, total5: 0 };
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
          const isPhase2 = isPhase2Match(matchInfo.group);
          const isPhase3 = isPhase3Match(matchInfo.group);
          const isPhase4 = isPhase4Match(matchInfo.group);
          const isPhase5 = isPhase5Match(matchInfo.group);

          userScores[voteData.userId].total += 1;
          if (isCorrect) {
            userScores[voteData.userId].correct += 1;
          }

          if (isPhase5) {
            userScores[voteData.userId].total5 += 1;
            if (isCorrect) userScores[voteData.userId].correct5 += 1;
          } else if (isPhase4) {
            userScores[voteData.userId].total4 += 1;
            if (isCorrect) userScores[voteData.userId].correct4 += 1;
          } else if (isPhase3) {
            userScores[voteData.userId].total3 += 1;
            if (isCorrect) userScores[voteData.userId].correct3 += 1;
          } else if (isPhase2) {
            userScores[voteData.userId].total2 += 1;
            if (isCorrect) userScores[voteData.userId].correct2 += 1;
          } else {
            userScores[voteData.userId].total1 += 1;
            if (isCorrect) userScores[voteData.userId].correct1 += 1;
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
              const isPhase2 = isPhase2Match(matchInfo.group);
              const isPhase3 = isPhase3Match(matchInfo.group);
              const isPhase4 = isPhase4Match(matchInfo.group);
              const isPhase5 = isPhase5Match(matchInfo.group);
              userScores[userId].total += 1;
              if (isPhase5) {
                userScores[userId].total5 += 1;
              } else if (isPhase4) {
                userScores[userId].total4 += 1;
              } else if (isPhase3) {
                userScores[userId].total3 += 1;
              } else if (isPhase2) {
                userScores[userId].total2 += 1;
              } else {
                userScores[userId].total1 += 1;
              }
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
            correctPredictionsPhase1: userScores[userId].correct1,
            totalPredictionsPhase1: userScores[userId].total1,
            correctPredictionsPhase2: userScores[userId].correct2,
            totalPredictionsPhase2: userScores[userId].total2,
            correctPredictionsPhase3: userScores[userId].correct3,
            totalPredictionsPhase3: userScores[userId].total3,
            correctPredictionsPhase4: userScores[userId].correct4,
            totalPredictionsPhase4: userScores[userId].total4,
            correctPredictionsPhase5: userScores[userId].correct5,
            totalPredictionsPhase5: userScores[userId].total5,
          });
        } else {
          batch.update(userRef, {
            correctPredictions: 0,
            totalPredictions: 0,
            correctPredictionsPhase1: 0,
            totalPredictionsPhase1: 0,
            correctPredictionsPhase2: 0,
            totalPredictionsPhase2: 0,
            correctPredictionsPhase3: 0,
            totalPredictionsPhase3: 0,
            correctPredictionsPhase4: 0,
            totalPredictionsPhase4: 0,
            correctPredictionsPhase5: 0,
            totalPredictionsPhase5: 0,
          });
        }
      }

      // Tự động kiểm tra và sửa lỗi đồng bộ đội thắng Bán kết vào Chung kết / Tranh hạng ba
      const checkAndRepairSF = (sfId, teamProp) => {
        const sf = dbMatches[sfId];
        if (sf && sf.status === "finished" && sf.result) {
          const isTeamAWon = sf.result === "teamA";
          const winner = isTeamAWon ? sf.teamA : sf.teamB;
          const loser = isTeamAWon ? sf.teamB : sf.teamA;
          
          const finalMatch = dbMatches["FINAL"];
          const thirdPlaceMatch = dbMatches["3RD_PLACE"];
          
          if (finalMatch && (!finalMatch[teamProp] || finalMatch[teamProp].name !== winner.name)) {
            batch.update(doc(db, "matches", "FINAL"), { [teamProp]: winner });
          }
          if (thirdPlaceMatch && (!thirdPlaceMatch[teamProp] || thirdPlaceMatch[teamProp].name !== loser.name)) {
            batch.update(doc(db, "matches", "3RD_PLACE"), { [teamProp]: loser });
          }
        }
      };
      checkAndRepairSF("SF_1", "teamA");
      checkAndRepairSF("SF_2", "teamB");

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
        collection(db, "users")
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
              .filter((u) => u.isAdmin !== true && u.displayName && u.displayName.trim() !== "" && u.displayName !== "Ẩn danh");
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
          const finishedMatches = {}; // matchId -> { result, kickoff, group }
          const dbMatches = {}; // matchId -> match data
          matchesSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            dbMatches[doc.id] = { id: doc.id, ...data };
            if (data.status === "finished" && data.result) {
              const kickoff = data.matchDate?.toDate ? data.matchDate.toDate() : new Date(data.matchDate);
              finishedMatches[doc.id] = { result: data.result, kickoff, group: data.group };
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
              userScores[doc.id] = { correct: 0, total: 0, correct1: 0, total1: 0, correct2: 0, total2: 0, correct3: 0, total3: 0, correct4: 0, total4: 0, correct5: 0, total5: 0 };
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
              const isPhase2 = isPhase2Match(matchInfo.group);
              const isPhase3 = isPhase3Match(matchInfo.group);
              const isPhase4 = isPhase4Match(matchInfo.group);
              const isPhase5 = isPhase5Match(matchInfo.group);

              userScores[voteData.userId].total += 1;
              if (isCorrect) {
                userScores[voteData.userId].correct += 1;
              }

              if (isPhase5) {
                userScores[voteData.userId].total5 += 1;
                if (isCorrect) userScores[voteData.userId].correct5 += 1;
              } else if (isPhase4) {
                userScores[voteData.userId].total4 += 1;
                if (isCorrect) userScores[voteData.userId].correct4 += 1;
              } else if (isPhase3) {
                userScores[voteData.userId].total3 += 1;
                if (isCorrect) userScores[voteData.userId].correct3 += 1;
              } else if (isPhase2) {
                userScores[voteData.userId].total2 += 1;
                if (isCorrect) userScores[voteData.userId].correct2 += 1;
              } else {
                userScores[voteData.userId].total1 += 1;
                if (isCorrect) userScores[voteData.userId].correct1 += 1;
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
                  const isPhase2 = isPhase2Match(matchInfo.group);
                  const isPhase3 = isPhase3Match(matchInfo.group);
                  const isPhase4 = isPhase4Match(matchInfo.group);
                  const isPhase5 = isPhase5Match(matchInfo.group);
                  userScores[userId].total += 1;
                  if (isPhase5) {
                    userScores[userId].total5 += 1;
                  } else if (isPhase4) {
                    userScores[userId].total4 += 1;
                  } else if (isPhase3) {
                    userScores[userId].total3 += 1;
                  } else if (isPhase2) {
                    userScores[userId].total2 += 1;
                  } else {
                    userScores[userId].total1 += 1;
                  }
                }
              }
            }
          }

          // Update users in Firestore
          for (const userDoc of usersSnapshot.docs) {
            const userId = userDoc.id;
            const userData = userDoc.data();
            const computed = userScores[userId] || { correct: 0, total: 0, correct1: 0, total1: 0, correct2: 0, total2: 0, correct3: 0, total3: 0, correct4: 0, total4: 0, correct5: 0, total5: 0 };
            
            if (
              userData.correctPredictions !== computed.correct ||
              userData.totalPredictions !== computed.total ||
              userData.correctPredictionsPhase1 !== computed.correct1 ||
              userData.totalPredictionsPhase1 !== computed.total1 ||
              userData.correctPredictionsPhase2 !== computed.correct2 ||
              userData.totalPredictionsPhase2 !== computed.total2 ||
              userData.correctPredictionsPhase3 !== computed.correct3 ||
              userData.totalPredictionsPhase3 !== computed.total3 ||
              userData.correctPredictionsPhase4 !== computed.correct4 ||
              userData.totalPredictionsPhase4 !== computed.total4 ||
              userData.correctPredictionsPhase5 !== computed.correct5 ||
              userData.totalPredictionsPhase5 !== computed.total5
            ) {
              const userRef = doc(db, "users", userId);
              batch.update(userRef, {
                correctPredictions: computed.correct,
                totalPredictions: computed.total,
                correctPredictionsPhase1: computed.correct1,
                totalPredictionsPhase1: computed.total1,
                correctPredictionsPhase2: computed.correct2,
                totalPredictionsPhase2: computed.total2,
                correctPredictionsPhase3: computed.correct3,
                totalPredictionsPhase3: computed.total3,
                correctPredictionsPhase4: computed.correct4,
                totalPredictionsPhase4: computed.total4,
                correctPredictionsPhase5: computed.correct5,
                totalPredictionsPhase5: computed.total5,
              });
              needsUpdate = true;
            }
          }

          // Tự động kiểm tra và sửa lỗi đồng bộ đội thắng Bán kết vào Chung kết / Tranh hạng ba
          const checkAndRepairSF = (sfId, teamProp) => {
            const sf = dbMatches[sfId];
            if (sf && sf.status === "finished" && sf.result) {
              const isTeamAWon = sf.result === "teamA";
              const winner = isTeamAWon ? sf.teamA : sf.teamB;
              const loser = isTeamAWon ? sf.teamB : sf.teamA;
              
              const finalMatch = dbMatches["FINAL"];
              const thirdPlaceMatch = dbMatches["3RD_PLACE"];
              
              if (finalMatch && (!finalMatch[teamProp] || finalMatch[teamProp].name !== winner.name)) {
                batch.update(doc(db, "matches", "FINAL"), { [teamProp]: winner });
                needsUpdate = true;
              }
              if (thirdPlaceMatch && (!thirdPlaceMatch[teamProp] || thirdPlaceMatch[teamProp].name !== loser.name)) {
                batch.update(doc(db, "matches", "3RD_PLACE"), { [teamProp]: loser });
                needsUpdate = true;
              }
            }
          };
          checkAndRepairSF("SF_1", "teamA");
          checkAndRepairSF("SF_2", "teamB");

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

  // Lọc và sắp xếp người dùng theo Tab hoạt động
  const sortedUsers = [...users]
    .filter((u) => {
      if (activeTab === "phase1") {
        return u.totalPredictionsPhase1 > 0 || (usingLocal && u.totalPredictionsPhase1 !== undefined);
      } else if (activeTab === "phase2") {
        return u.totalPredictionsPhase2 > 0 || (usingLocal && u.totalPredictionsPhase2 !== undefined);
      } else if (activeTab === "phase3") {
        return u.totalPredictionsPhase3 > 0 || (usingLocal && u.totalPredictionsPhase3 !== undefined);
      } else if (activeTab === "phase4") {
        return u.totalPredictionsPhase4 > 0 || (usingLocal && u.totalPredictionsPhase4 !== undefined);
      } else if (activeTab === "phase5") {
        return u.totalPredictionsPhase5 > 0 || (usingLocal && u.totalPredictionsPhase5 !== undefined);
      } else {
        return u.totalPredictions > 0 || (usingLocal && u.totalPredictions !== undefined);
      }
    })
    .sort((a, b) => {
      let correctA, totalA, correctB, totalB;
      if (activeTab === "phase1") {
        correctA = a.correctPredictionsPhase1 || 0;
        totalA = a.totalPredictionsPhase1 || 0;
        correctB = b.correctPredictionsPhase1 || 0;
        totalB = b.totalPredictionsPhase1 || 0;
      } else if (activeTab === "phase2") {
        correctA = a.correctPredictionsPhase2 || 0;
        totalA = a.totalPredictionsPhase2 || 0;
        correctB = b.correctPredictionsPhase2 || 0;
        totalB = b.totalPredictionsPhase2 || 0;
      } else if (activeTab === "phase3") {
        correctA = a.correctPredictionsPhase3 || 0;
        totalA = a.totalPredictionsPhase3 || 0;
        correctB = b.correctPredictionsPhase3 || 0;
        totalB = b.totalPredictionsPhase3 || 0;
      } else if (activeTab === "phase4") {
        correctA = a.correctPredictionsPhase4 || 0;
        totalA = a.totalPredictionsPhase4 || 0;
        correctB = b.correctPredictionsPhase4 || 0;
        totalB = b.totalPredictionsPhase4 || 0;
      } else if (activeTab === "phase5") {
        correctA = a.correctPredictionsPhase5 || 0;
        totalA = a.totalPredictionsPhase5 || 0;
        correctB = b.correctPredictionsPhase5 || 0;
        totalB = b.totalPredictionsPhase5 || 0;
      } else {
        correctA = a.correctPredictions || 0;
        totalA = a.totalPredictions || 0;
        correctB = b.correctPredictions || 0;
        totalB = b.totalPredictions || 0;
      }

      if (correctA !== correctB) return correctB - correctA; // Đúng nhiều hơn xếp trước
      if (totalA !== totalB) return totalA - totalB; // Đoán ít hơn (tỷ lệ tốt hơn) xếp trước
      return (a.displayName || "").localeCompare(b.displayName || ""); // Tên theo bảng chữ cái
    });

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

      {/* Tabs chuyển đổi giữa các bảng xếp hạng */}
      <div className="leaderboard-tabs" style={{
        display: "flex",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: "6px",
        marginBottom: "30px",
        padding: "6px",
        background: "rgba(255, 255, 255, 0.02)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-subtle)",
        maxWidth: "850px",
        margin: "0 auto 30px auto"
      }}>
        <button
          onClick={() => setActiveTab("chung_cuoc")}
          style={{
            padding: "8px 10px",
            fontSize: "0.75rem",
            fontWeight: "600",
            borderRadius: "var(--radius-md)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.25s ease",
            background: activeTab === "chung_cuoc" ? "var(--gradient-primary)" : "transparent",
            color: activeTab === "chung_cuoc" ? "#0a0e1a" : "var(--text-secondary)"
          }}
          className="lb-tab-btn"
        >
          🏆 Chung Cuộc
        </button>
        <button
          onClick={() => setActiveTab("phase1")}
          style={{
            padding: "8px 10px",
            fontSize: "0.75rem",
            fontWeight: "600",
            borderRadius: "var(--radius-md)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.25s ease",
            background: activeTab === "phase1" ? "var(--gradient-primary)" : "transparent",
            color: activeTab === "phase1" ? "#0a0e1a" : "var(--text-secondary)"
          }}
          className="lb-tab-btn"
        >
          ⚔️ Vòng Bảng - V32
        </button>
        <button
          onClick={() => setActiveTab("phase2")}
          style={{
            padding: "8px 10px",
            fontSize: "0.75rem",
            fontWeight: "600",
            borderRadius: "var(--radius-md)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.25s ease",
            background: activeTab === "phase2" ? "var(--gradient-primary)" : "transparent",
            color: activeTab === "phase2" ? "#0a0e1a" : "var(--text-secondary)"
          }}
          className="lb-tab-btn"
        >
          ⚽ Vòng 16 Đội
        </button>
        <button
          onClick={() => setActiveTab("phase3")}
          style={{
            padding: "8px 10px",
            fontSize: "0.75rem",
            fontWeight: "600",
            borderRadius: "var(--radius-md)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.25s ease",
            background: activeTab === "phase3" ? "var(--gradient-primary)" : "transparent",
            color: activeTab === "phase3" ? "#0a0e1a" : "var(--text-secondary)"
          }}
          className="lb-tab-btn"
        >
          🔥 Vòng 8 Đội
        </button>
        <button
          onClick={() => setActiveTab("phase4")}
          style={{
            padding: "8px 10px",
            fontSize: "0.75rem",
            fontWeight: "600",
            borderRadius: "var(--radius-md)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.25s ease",
            background: activeTab === "phase4" ? "var(--gradient-primary)" : "transparent",
            color: activeTab === "phase4" ? "#0a0e1a" : "var(--text-secondary)"
          }}
          className="lb-tab-btn"
        >
          📢 Bán Kết
        </button>
        <button
          onClick={() => setActiveTab("phase5")}
          style={{
            padding: "8px 10px",
            fontSize: "0.75rem",
            fontWeight: "600",
            borderRadius: "var(--radius-md)",
            border: "none",
            cursor: "pointer",
            transition: "all 0.25s ease",
            background: activeTab === "phase5" ? "var(--gradient-primary)" : "transparent",
            color: activeTab === "phase5" ? "#0a0e1a" : "var(--text-secondary)"
          }}
          className="lb-tab-btn"
        >
          🏁 Chung Kết + Hạng Ba
        </button>
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
            {sortedUsers.length > 0 && (() => {
              const getStats = (u) => {
                if (activeTab === "phase1") {
                  const correct = u.correctPredictionsPhase1 || 0;
                  const total = u.totalPredictionsPhase1 || 0;
                  return { correct, total, wrong: total - correct };
                } else if (activeTab === "phase2") {
                  const correct = u.correctPredictionsPhase2 || 0;
                  const total = u.totalPredictionsPhase2 || 0;
                  return { correct, total, wrong: total - correct };
                } else if (activeTab === "phase3") {
                  const correct = u.correctPredictionsPhase3 || 0;
                  const total = u.totalPredictionsPhase3 || 0;
                  return { correct, total, wrong: total - correct };
                } else if (activeTab === "phase4") {
                  const correct = u.correctPredictionsPhase4 || 0;
                  const total = u.totalPredictionsPhase4 || 0;
                  return { correct, total, wrong: total - correct };
                } else if (activeTab === "phase5") {
                  const correct = u.correctPredictionsPhase5 || 0;
                  const total = u.totalPredictionsPhase5 || 0;
                  return { correct, total, wrong: total - correct };
                } else {
                  const correct = u.correctPredictions || 0;
                  const total = u.totalPredictions || 0;
                  return { correct, total, wrong: total - correct };
                }
              };

              const userStats = sortedUsers.map(getStats);
              const totalCorrect = userStats.reduce((sum, s) => sum + s.correct, 0);
              const totalWrong = userStats.reduce((sum, s) => sum + s.wrong, 0);
              const totalPredictions = userStats.reduce((sum, s) => sum + s.total, 0);
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
            {sortedUsers.map((user, index) => {
              const correct = activeTab === "phase1"
                ? (user.correctPredictionsPhase1 || 0)
                : activeTab === "phase2"
                ? (user.correctPredictionsPhase2 || 0)
                : activeTab === "phase3"
                ? (user.correctPredictionsPhase3 || 0)
                : activeTab === "phase4"
                ? (user.correctPredictionsPhase4 || 0)
                : activeTab === "phase5"
                ? (user.correctPredictionsPhase5 || 0)
                : (user.correctPredictions || 0);

              const total = activeTab === "phase1"
                ? (user.totalPredictionsPhase1 || 0)
                : activeTab === "phase2"
                ? (user.totalPredictionsPhase2 || 0)
                : activeTab === "phase3"
                ? (user.totalPredictionsPhase3 || 0)
                : activeTab === "phase4"
                ? (user.totalPredictionsPhase4 || 0)
                : activeTab === "phase5"
                ? (user.totalPredictionsPhase5 || 0)
                : (user.totalPredictions || 0);

              const wrongCount = total - correct;
              const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
              const isTop3 = index < 3;

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
                    {correct}
                  </td>
                  <td className="lb-cell lb-cell--wrong">
                    {wrongCount}
                  </td>
                  <td className="lb-cell lb-cell--total">
                    {total}
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
