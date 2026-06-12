import { useEffect, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../lib/firebase";

/**
 * Hook xử lý logic bình chọn cho một trận đấu cụ thể.
 * - Kiểm tra user đã vote chưa
 * - Thực hiện vote bằng Firestore Transaction (atomic)
 * - Trả về trạng thái vote hiện tại
 */
export function useVote(matchId, userId) {
  const [userVote, setUserVote] = useState(null); // "teamA" | "draw" | "teamB" | null
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  // Kiểm tra user đã vote trận này chưa
  useEffect(() => {
    if (!matchId || !userId) {
      setUserVote(null);
      setLoading(false);
      return;
    }

    const checkExistingVote = async () => {
      try {
        const q = query(
          collection(db, "votes"),
          where("matchId", "==", matchId),
          where("userId", "==", userId)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setUserVote(snapshot.docs[0].data().vote);
        } else {
          setUserVote(null);
        }
      } catch {
        setUserVote(null);
      }
      setLoading(false);
    };

    checkExistingVote();
  }, [matchId, userId]);

  // Thực hiện vote bằng Transaction
  const castVote = useCallback(
    async (vote, userName, userAvatar) => {
      if (!userId || !matchId || userVote || voting) return;

      setVoting(true);
      try {
        const matchRef = doc(db, "matches", matchId);
        const voteRef = doc(collection(db, "votes"));

        await runTransaction(db, async (transaction) => {
          const matchDoc = await transaction.get(matchRef);
          if (!matchDoc.exists()) {
            throw new Error("Trận đấu không tồn tại");
          }

          const matchData = matchDoc.data();
          if (matchData.status !== "upcoming") {
            throw new Error("Trận đấu đã bắt đầu, không thể bình chọn");
          }

          // Tạo vote document
          transaction.set(voteRef, {
            matchId,
            userId,
            userName: userName || "Ẩn danh",
            userAvatar: userAvatar || null,
            vote,
            createdAt: serverTimestamp(),
            isCorrect: null,
          });

          // Cập nhật counter trong match
          transaction.update(matchRef, {
            [`votes.${vote}`]: increment(1),
            "votes.total": increment(1),
          });
        });

        setUserVote(vote);
      } catch (error) {
        console.error("Vote error:", error);
        throw error;
      } finally {
        setVoting(false);
      }
    },
    [matchId, userId, userVote, voting]
  );

  return { userVote, loading, voting, castVote };
}
