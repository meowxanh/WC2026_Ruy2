import { useEffect, useState, useRef } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
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

  return { matches, loading, usingLocal };
}
