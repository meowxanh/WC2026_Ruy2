import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  where,
  getDocs,
  writeBatch,
  increment,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { seedMatches } from "../data/seedMatches";
import { useAuth } from "../contexts/AuthContext";

const FIRESTORE_TIMEOUT_MS = 3000;

const isPhase2Match = (groupName) => {
  if (!groupName) return false;
  const name = groupName.toLowerCase();
  return name.includes("16");
};

const isPhase3Match = (groupName) => {
  if (!groupName) return false;
  const name = groupName.toLowerCase();
  return name.includes("tứ kết") || name.includes("bán kết") || name.includes("hạng ba") || name.includes("chung kết");
};

/**
 * Hook lấy danh sách trận đấu real-time từ Firestore.
 * Nếu Firestore không phản hồi trong 3s hoặc trống → fallback về seed data.
 */
export function useMatches() {
  const [matches, setMatches] = useState(seedMatches);
  const [loading, setLoading] = useState(true);
  const [usingLocal, setUsingLocal] = useState(false);
  const resolved = useRef(false);

  const auth = useAuth();
  const isAdmin = auth?.isAdmin;

  useEffect(() => {
    let unsubscribe;
    let timeoutId;

    const fallbackToLocal = () => {
      if (!resolved.current) {
        resolved.current = true;
        setMatches(seedMatches);
        setUsingLocal(true);
        setLoading(false);
      }
    };

    // Timeout: nếu Firestore không phản hồi trong 3s → dùng seed data
    timeoutId = setTimeout(fallbackToLocal, FIRESTORE_TIMEOUT_MS);

    try {
      const q = query(
        collection(db, "matches"),
        orderBy("matchDate", "asc")
      );
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          clearTimeout(timeoutId);
          resolved.current = true;
          if (snapshot.empty) {
            setMatches(seedMatches);
            setUsingLocal(true);
          } else {
            const data = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              matchDate: doc.data().matchDate?.toDate
                ? doc.data().matchDate.toDate()
                : new Date(doc.data().matchDate),
            }));

            // Tự động đẩy các trận đấu còn thiếu trong Firestore từ file seedMatches
            const dbMatchIds = new Set(data.map((m) => m.id));
            const missingMatches = seedMatches.filter((m) => !dbMatchIds.has(m.id));
            if (missingMatches.length > 0) {
              console.log(`Auto-seeding ${missingMatches.length} missing matches to Firestore...`);
              const batch = writeBatch(db);
              missingMatches.forEach((match) => {
                const { id, matchDate, ...rest } = match;
                const matchRef = doc(db, "matches", id);
                batch.set(matchRef, {
                  ...rest,
                  matchDate: Timestamp.fromDate(
                    matchDate instanceof Date ? matchDate : new Date(matchDate)
                  ),
                });
              });
              batch
                .commit()
                .then(() => {
                  console.log("Auto-seeding matches success!");
                })
                .catch((err) => {
                  console.error("Auto-seeding matches error:", err);
                });
            }

            setMatches(data);
            setUsingLocal(false);
          }
          setLoading(false);
        },
        () => {
          clearTimeout(timeoutId);
          fallbackToLocal();
        }
      );
    } catch {
      clearTimeout(timeoutId);
      fallbackToLocal();
    }

    return () => {
      clearTimeout(timeoutId);
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (loading || usingLocal || matches.length === 0) return;

    const checkAndFinishMatches = async () => {
      const now = new Date();
      const matchesToFinish = matches.filter((m) => {
        const kickoff = m.matchDate instanceof Date ? m.matchDate : new Date(m.matchDate);
        const twoHours = 2 * 60 * 60 * 1000;
        const hasEnded = now >= new Date(kickoff.getTime() + twoHours);
        return (
          hasEnded &&
          m.status !== "finished" &&
          m.scoreA !== null &&
          m.scoreB !== null
        );
      });

      if (matchesToFinish.length === 0) return;

      console.log(
        `Found ${matchesToFinish.length} matches to auto-finish:`,
        matchesToFinish.map((m) => m.id)
      );

      for (const match of matchesToFinish) {
        try {
          const kickoff = match.matchDate instanceof Date ? match.matchDate : new Date(match.matchDate);
          const sA = match.scoreA;
          const sB = match.scoreB;
          let result = "draw";
          if (sA > sB) result = "teamA";
          else if (sA < sB) result = "teamB";

          const matchRef = doc(db, "matches", match.id);

          // 1. Update match status in database
          await updateDoc(matchRef, {
            status: "finished",
            result: result,
          });

          // 2. Query and update votes
          const votesQuery = query(
            collection(db, "votes"),
            where("matchId", "==", match.id)
          );
          const votesSnapshot = await getDocs(votesQuery);
          const usersSnapshot = await getDocs(collection(db, "users"));
          const votedUserIds = new Set();
          const batch = writeBatch(db);

          const isPhase2 = isPhase2Match(match.group);
          const isPhase3 = isPhase3Match(match.group);
          if (!votesSnapshot.empty) {
            for (const voteDoc of votesSnapshot.docs) {
              const voteData = voteDoc.data();
              const isCorrect = voteData.vote === result;
              votedUserIds.add(voteData.userId);

              batch.update(voteDoc.ref, { isCorrect });

              const userRef = doc(db, "users", voteData.userId);
              const updates = {
                correctPredictions: increment(isCorrect ? 1 : 0),
                totalPredictions: increment(1),
              };
              if (isPhase3) {
                updates.correctPredictionsPhase3 = increment(isCorrect ? 1 : 0);
                updates.totalPredictionsPhase3 = increment(1);
              } else if (isPhase2) {
                updates.correctPredictionsPhase2 = increment(isCorrect ? 1 : 0);
                updates.totalPredictionsPhase2 = increment(1);
              } else {
                updates.correctPredictionsPhase1 = increment(isCorrect ? 1 : 0);
                updates.totalPredictionsPhase1 = increment(1);
              }
              batch.update(userRef, updates);
            }
          }

          // Cộng 1 điểm sai (tăng totalPredictions) cho những người chưa bình chọn
          // Chỉ áp dụng từ trận Qatar vs Thụy Sĩ (2026-06-14T02:00:00+07:00)
          // Và chỉ áp dụng cho người chơi (không tính Admin) có ngày đăng ký <= giờ kickoff
          const thresholdDate = new Date("2026-06-14T02:00:00+07:00");
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
                const updates = {
                  totalPredictions: increment(1),
                };
                if (isPhase3) {
                  updates.totalPredictionsPhase3 = increment(1);
                } else if (isPhase2) {
                  updates.totalPredictionsPhase2 = increment(1);
                } else {
                  updates.totalPredictionsPhase1 = increment(1);
                }
                batch.update(userRef, updates);
              }
            }
          }

          // Tự động đẩy đội thắng vào Chung kết, đội thua vào Tranh hạng ba
          if (match.id === "SF_1" || match.id === "SF_2") {
            const isTeamAWon = result === "teamA";
            const winner = isTeamAWon ? match.teamA : match.teamB;
            const loser = isTeamAWon ? match.teamB : match.teamA;
            
            if (match.id === "SF_1") {
              batch.update(doc(db, "matches", "FINAL"), { teamA: winner });
              batch.update(doc(db, "matches", "3RD_PLACE"), { teamA: loser });
            } else {
              batch.update(doc(db, "matches", "FINAL"), { teamB: winner });
              batch.update(doc(db, "matches", "3RD_PLACE"), { teamB: loser });
            }
          }

          await batch.commit();
          console.log(`Auto-finished match ${match.id} and calculated points (applying threshold & reg date bounds)!`);
        } catch (err) {
          console.error(`Error auto-finishing match ${match.id}:`, err);
        }
      }
    };

    checkAndFinishMatches();
  }, [matches, loading, usingLocal]);

  // Real-time API scores synchronization effect
  useEffect(() => {
    if (loading) return;
    // In online mode, only Admin clients should sync with Firestore.
    // In local mode, any client can sync to local state.
    if (!usingLocal && !isAdmin) return;

    const fetchLiveScores = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || "/";
        const response = await fetch(`${baseUrl}live-scores.json`);
        if (!response.ok) return;

        const data = await response.json();
        if (!data || !Array.isArray(data.matches)) return;

        if (usingLocal) {
          // Local mode: update local matches state directly
          setMatches((currentMatches) => {
            let changed = false;
            const updated = currentMatches.map((dbMatch) => {
              const liveMatch = data.matches.find((m) => m.id === dbMatch.id);
              if (!liveMatch) return dbMatch;

              const statusChanged = liveMatch.status && dbMatch.status !== liveMatch.status && dbMatch.status !== "finished";
              const scoreAChanged = liveMatch.scoreA !== undefined && dbMatch.scoreA !== liveMatch.scoreA;
              const scoreBChanged = liveMatch.scoreB !== undefined && dbMatch.scoreB !== liveMatch.scoreB;

              if (statusChanged || scoreAChanged || scoreBChanged) {
                changed = true;
                const updatedMatch = { ...dbMatch };
                if (statusChanged) updatedMatch.status = liveMatch.status;
                if (scoreAChanged) updatedMatch.scoreA = liveMatch.scoreA;
                if (scoreBChanged) updatedMatch.scoreB = liveMatch.scoreB;

                if (liveMatch.status === "finished" && dbMatch.status !== "finished") {
                  const sA = liveMatch.scoreA !== undefined ? liveMatch.scoreA : (dbMatch.scoreA || 0);
                  const sB = liveMatch.scoreB !== undefined ? liveMatch.scoreB : (dbMatch.scoreB || 0);
                  let result = "draw";
                  if (sA > sB) result = "teamA";
                  else if (sA < sB) result = "teamB";
                  updatedMatch.result = result;
                }
                return updatedMatch;
              }
              return dbMatch;
            });
            return changed ? updated : currentMatches;
          });
        } else {
          // Online mode: Admin updates Firestore
          for (const liveMatch of data.matches) {
            const dbMatch = matches.find(m => m.id === liveMatch.id);
            if (!dbMatch) continue;

            const statusChanged = liveMatch.status && dbMatch.status !== liveMatch.status && dbMatch.status !== "finished";
            const scoreAChanged = liveMatch.scoreA !== undefined && dbMatch.scoreA !== liveMatch.scoreA;
            const scoreBChanged = liveMatch.scoreB !== undefined && dbMatch.scoreB !== liveMatch.scoreB;

            if (statusChanged || scoreAChanged || scoreBChanged) {
              const matchRef = doc(db, "matches", liveMatch.id);

              if (liveMatch.status === "finished" && dbMatch.status !== "finished") {
                console.log(`Live Score Sync: Match ${liveMatch.id} finished. Calculating points...`);
                const sA = liveMatch.scoreA !== undefined ? liveMatch.scoreA : (dbMatch.scoreA || 0);
                const sB = liveMatch.scoreB !== undefined ? liveMatch.scoreB : (dbMatch.scoreB || 0);
                let result = "draw";
                if (sA > sB) result = "teamA";
                else if (sA < sB) result = "teamB";

                const batch = writeBatch(db);
                batch.update(matchRef, {
                  status: "finished",
                  scoreA: sA,
                  scoreB: sB,
                  result: result
                });

                const votesQuery = query(collection(db, "votes"), where("matchId", "==", liveMatch.id));
                const votesSnapshot = await getDocs(votesQuery);
                const usersSnapshot = await getDocs(collection(db, "users"));
                const votedUserIds = new Set();

                const isPhase2 = isPhase2Match(dbMatch.group);
                const isPhase3 = isPhase3Match(dbMatch.group);
                if (!votesSnapshot.empty) {
                  for (const voteDoc of votesSnapshot.docs) {
                    const voteData = voteDoc.data();
                    const isCorrect = voteData.vote === result;
                    votedUserIds.add(voteData.userId);

                    batch.update(voteDoc.ref, { isCorrect });

                    const userRef = doc(db, "users", voteData.userId);
                    const updates = {
                      correctPredictions: increment(isCorrect ? 1 : 0),
                      totalPredictions: increment(1),
                    };
                    if (isPhase3) {
                      updates.correctPredictionsPhase3 = increment(isCorrect ? 1 : 0);
                      updates.totalPredictionsPhase3 = increment(1);
                    } else if (isPhase2) {
                      updates.correctPredictionsPhase2 = increment(isCorrect ? 1 : 0);
                      updates.totalPredictionsPhase2 = increment(1);
                    } else {
                      updates.correctPredictionsPhase1 = increment(isCorrect ? 1 : 0);
                      updates.totalPredictionsPhase1 = increment(1);
                    }
                    batch.update(userRef, updates);
                  }
                }

                const kickoff = dbMatch.matchDate instanceof Date ? dbMatch.matchDate : new Date(dbMatch.matchDate);
                const thresholdDate = new Date("2026-06-14T02:00:00+07:00");
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
                      const updates = {
                        totalPredictions: increment(1),
                      };
                      if (isPhase3) {
                        updates.totalPredictionsPhase3 = increment(1);
                      } else if (isPhase2) {
                        updates.totalPredictionsPhase2 = increment(1);
                      } else {
                        updates.totalPredictionsPhase1 = increment(1);
                      }
                      batch.update(userRef, updates);
                    }
                  }
                }

                // Tự động đẩy đội thắng vào Chung kết, đội thua vào Tranh hạng ba
                if (liveMatch.id === "SF_1" || liveMatch.id === "SF_2") {
                  const isTeamAWon = result === "teamA";
                  const winner = isTeamAWon ? dbMatch.teamA : dbMatch.teamB;
                  const loser = isTeamAWon ? dbMatch.teamB : dbMatch.teamA;
                  
                  if (liveMatch.id === "SF_1") {
                    batch.update(doc(db, "matches", "FINAL"), { teamA: winner });
                    batch.update(doc(db, "matches", "3RD_PLACE"), { teamA: loser });
                  } else {
                    batch.update(doc(db, "matches", "FINAL"), { teamB: winner });
                    batch.update(doc(db, "matches", "3RD_PLACE"), { teamB: loser });
                  }
                }

                await batch.commit();
                console.log(`Live Score Sync: Match ${liveMatch.id} finished and predictions synced.`);
              } else {
                console.log(`Live Score Sync: Updating live scores for match ${liveMatch.id}`);
                const updates = {};
                if (statusChanged) updates.status = liveMatch.status;
                if (scoreAChanged) updates.scoreA = liveMatch.scoreA;
                if (scoreBChanged) updates.scoreB = liveMatch.scoreB;
                await updateDoc(matchRef, updates);
              }
            }
          }
        }
      } catch (err) {
        console.warn("Live score API sync warning:", err.message);
      }
    };

    fetchLiveScores();
    const timer = setInterval(fetchLiveScores, 30000);
    return () => clearInterval(timer);
  }, [matches, loading, usingLocal, isAdmin]);

  return { matches, loading, usingLocal };
}
