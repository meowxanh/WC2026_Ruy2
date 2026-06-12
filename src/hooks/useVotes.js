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
  const [voteDocId, setVoteDocId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  // Kiểm tra user đã vote trận này chưa
  useEffect(() => {
    if (!matchId || !userId) {
      setUserVote(null);
      setVoteDocId(null);
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
          setVoteDocId(snapshot.docs[0].id);
        } else {
          setUserVote(null);
          setVoteDocId(null);
        }
      } catch {
        setUserVote(null);
        setVoteDocId(null);
      }
      setLoading(false);
    };

    checkExistingVote();
  }, [matchId, userId]);

  // Thực hiện vote bằng Transaction
  const castVote = useCallback(
    async (vote, userName, userAvatar) => {
      if (!userId || !matchId || voting) return;
      if (vote === userVote) return;

      setVoting(true);
      try {
        const matchRef = doc(db, "matches", matchId);
        const isUpdate = !!voteDocId;
        const voteRef = isUpdate
          ? doc(db, "votes", voteDocId)
          : doc(collection(db, "votes"));

        await runTransaction(db, async (transaction) => {
          const matchDoc = await transaction.get(matchRef);
          if (!matchDoc.exists()) {
            throw new Error("Trận đấu không tồn tại");
          }

          const matchData = matchDoc.data();
          const isMatchLocked = (matchData.status !== "upcoming" || new Date() >= matchData.matchDate.toDate()) && !matchData.forceUnlocked;
          if (isMatchLocked) {
            throw new Error("Trận đấu đã bắt đầu, không thể bình chọn hoặc thay đổi");
          }

          if (isUpdate) {
            const voteDoc = await transaction.get(voteRef);
            if (!voteDoc.exists()) {
              throw new Error("Bình chọn không tồn tại");
            }
            const oldVote = voteDoc.data().vote;
            if (oldVote === vote) return;

            // Cập nhật vote document
            transaction.update(voteRef, {
              vote,
              updatedAt: serverTimestamp(),
            });

            // Cập nhật counter trong match: trừ vote cũ, cộng vote mới
            transaction.update(matchRef, {
              [`votes.${oldVote}`]: increment(-1),
              [`votes.${vote}`]: increment(1),
            });
          } else {
            // Tạo mới vote document
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
          }
        });

        setUserVote(vote);
        if (!isUpdate) {
          setVoteDocId(voteRef.id);
        }
      } catch (error) {
        console.error("Vote error:", error);
        throw error;
      } finally {
        setVoting(false);
      }
    },
    [matchId, userId, userVote, voteDocId, voting]
  );

  const cancelVote = useCallback(
    async () => {
      if (!userId || !matchId || voting || !voteDocId || !userVote) return;

      setVoting(true);
      try {
        const matchRef = doc(db, "matches", matchId);
        const voteRef = doc(db, "votes", voteDocId);

        await runTransaction(db, async (transaction) => {
          const matchDoc = await transaction.get(matchRef);
          if (!matchDoc.exists()) {
            throw new Error("Trận đấu không tồn tại");
          }

          const matchData = matchDoc.data();
          const isMatchLocked =
            (matchData.status !== "upcoming" ||
              new Date() >= matchData.matchDate.toDate()) &&
            !matchData.forceUnlocked;
          if (isMatchLocked) {
            throw new Error("Trận đấu đã bắt đầu, không thể hủy bình chọn");
          }

          const voteDoc = await transaction.get(voteRef);
          if (!voteDoc.exists()) {
            throw new Error("Bình chọn không tồn tại");
          }

          const currentVote = voteDoc.data().vote;

          // Delete vote document
          transaction.delete(voteRef);

          // Update counter in match: decrement currentVote and total
          transaction.update(matchRef, {
            [`votes.${currentVote}`]: increment(-1),
            "votes.total": increment(-1),
          });
        });

        setUserVote(null);
        setVoteDocId(null);
      } catch (error) {
        console.error("Cancel vote error:", error);
        throw error;
      } finally {
        setVoting(false);
      }
    },
    [matchId, userId, userVote, voteDocId, voting]
  );

  return { userVote, loading, voting, castVote, cancelVote };
}
