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
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { seedMatches } from "../data/seedMatches";

const FIRESTORE_TIMEOUT_MS = 3000;

/**
 * Hook lấy danh sách trận đấu real-time từ Firestore.
 * Nếu Firestore không phản hồi trong 3s hoặc trống → fallback về seed data.
 */
export function useMatches() {
  const [matches, setMatches] = useState(seedMatches);
  const [loading, setLoading] = useState(true);
  const [usingLocal, setUsingLocal] = useState(false);
  const resolved = useRef(false);

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

          if (!votesSnapshot.empty) {
            const batch = writeBatch(db);

            for (const voteDoc of votesSnapshot.docs) {
              const voteData = voteDoc.data();
              const isCorrect = voteData.vote === result;

              batch.update(voteDoc.ref, { isCorrect });

              const userRef = doc(db, "users", voteData.userId);
              batch.update(userRef, {
                correctPredictions: increment(isCorrect ? 1 : 0),
                totalPredictions: increment(1),
              });
            }
            await batch.commit();
          }
          console.log(`Auto-finished match ${match.id} and calculated points!`);
        } catch (err) {
          console.error(`Error auto-finishing match ${match.id}:`, err);
        }
      }
    };

    checkAndFinishMatches();
  }, [matches, loading, usingLocal]);

  return { matches, loading, usingLocal };
}
