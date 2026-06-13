import { useEffect, useRef } from "react";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Hook tự động đồng bộ tỷ số từ /live_scores.json lên Firestore dành riêng cho Admin.
 * @param {Array} matches Danh sách trận đấu hiện tại lấy từ Firestore.
 * @param {Boolean} isAdmin Quyền admin của tài khoản đang đăng nhập.
 */
export function useScoreSync(matches, isAdmin) {
  const syncInProgressRef = useRef(false);

  useEffect(() => {
    if (!isAdmin || !matches || matches.length === 0) return;

    const syncScores = async () => {
      if (syncInProgressRef.current) return;
      syncInProgressRef.current = true;

      try {
        // Fetch public scores JSON feed
        const response = await fetch("/live_scores.json?t=" + Date.now());
        if (!response.ok) {
          throw new Error("Không thể tải nguồn cấp tỷ số.");
        }
        
        const feedData = await response.json();
        const feedMatches = feedData.matches || [];

        for (const feedMatch of feedMatches) {
          const dbMatch = matches.find((m) => m.id === feedMatch.id);
          if (!dbMatch) continue;

          // Nếu trận đấu bị Admin khóa hoặc cập nhật thủ công -> Bỏ qua không đồng bộ tự động
          if (dbMatch.isManualScore === true) {
            continue;
          }

          // Kiểm tra xem tỉ số hoặc trạng thái có thay đổi không
          const scoreAChanged = dbMatch.scoreA !== feedMatch.scoreA;
          const scoreBChanged = dbMatch.scoreB !== feedMatch.scoreB;
          const statusChanged = dbMatch.status !== feedMatch.status;

          if (scoreAChanged || scoreBChanged || statusChanged) {
            console.log(`[AutoSync] Phát hiện thay đổi trận ${feedMatch.id}:`, feedMatch);

            let result = null;
            let sA = feedMatch.scoreA;
            let sB = feedMatch.scoreB;
            const newStatus = feedMatch.status;

            if (newStatus === "finished") {
              if (sA === null || sB === null) {
                console.warn(`[AutoSync] Trận ${feedMatch.id} kết thúc nhưng thiếu tỷ số. Bỏ qua.`);
                continue;
              }
              if (sA > sB) result = "teamA";
              else if (sA < sB) result = "teamB";
              else result = "draw";
            } else if (newStatus === "live") {
              if (sA === null) sA = 0;
              if (sB === null) sB = 0;
            } else {
              sA = null;
              sB = null;
            }

            const matchRef = doc(db, "matches", dbMatch.id);

            // 1. Cập nhật Firestore match document
            await updateDoc(matchRef, {
              status: newStatus,
              scoreA: sA,
              scoreB: sB,
              result: result,
            });

            // 2. Nếu trận đấu chuyển sang trạng thái "finished" -> Tính toán và cộng điểm dự đoán
            if (newStatus === "finished" && result) {
              const votesQuery = query(collection(db, "votes"), where("matchId", "==", dbMatch.id));
              const votesSnapshot = await getDocs(votesQuery);

              if (!votesSnapshot.empty) {
                const batch = writeBatch(db);

                for (const voteDoc of votesSnapshot.docs) {
                  const voteData = voteDoc.data();
                  const isCorrect = voteData.vote === result;
                  const wasCorrect = voteData.isCorrect;

                  batch.update(voteDoc.ref, { isCorrect });

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
                    totalPredictions: increment(totalInc),
                  });
                }

                await batch.commit();
                console.log(`[AutoSync] Tính điểm hoàn tất cho trận ${feedMatch.id}`);
              }
            }

            // 3. Nếu trạng thái trước đó là finished nhưng giờ hoàn tác về live/upcoming
            if (dbMatch.status === "finished" && newStatus !== "finished") {
              const votesQuery = query(collection(db, "votes"), where("matchId", "==", dbMatch.id));
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
                      totalPredictions: increment(-1),
                    });
                  }
                }

                await batch.commit();
                console.log(`[AutoSync] Hoàn tác tính điểm hoàn tất cho trận ${feedMatch.id}`);
              }
            }
          }
        }
      } catch (err) {
        console.error("[AutoSync] Lỗi trong quá trình đồng bộ tỷ số:", err);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    // Chạy đồng bộ ngay khi load trang
    syncScores();

    // Thiết lập chạy định kỳ mỗi 60 giây
    const intervalId = setInterval(syncScores, 60000);
    return () => clearInterval(intervalId);
  }, [matches, isAdmin]);
}
