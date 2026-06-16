import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useVote } from "../../hooks/useVotes";

/**
 * Widget bình chọn cho mỗi trận đấu.
 * - 3 nút: Đội A thắng / Hòa / Đội B thắng
 * - Progress bar realtime hiển thị tỷ lệ %
 * - Khóa bình chọn khi trận đã diễn ra
 */
export default function VoteWidget({ match }) {
  const { user, isAdmin } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState(isAdmin ? "" : user?.uid);
  const [usersList, setUsersList] = useState([]);
  const [allVotes, setAllVotes] = useState([]);

  const { userVote, loading, voting, castVote, cancelVote } = useVote(
    match.id,
    selectedUserId
  );

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Fetch users list for listing voter details and delegated voting
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const list = snapshot.docs
          .map(doc => ({
            uid: doc.id,
            displayName: doc.data().displayName || doc.data().email || "Ẩn danh",
            photoURL: doc.data().photoURL,
            isAdmin: doc.data().isAdmin,
            createdAt: doc.data().createdAt
          }))
          .filter(u => u.isAdmin !== true)
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
        setUsersList(list);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    fetchUsers();
  }, []);

  // Update selectedUserId for admins when usersList is loaded
  useEffect(() => {
    if (isAdmin && usersList.length > 0) {
      setSelectedUserId(prev => {
        if (!usersList.some(u => u.uid === prev)) {
          return "";
        }
        return prev;
      });
    }
  }, [isAdmin, usersList]);

  // Real-time listener for all votes on this match
  useEffect(() => {
    if (!match.id) return;
    const q = query(collection(db, "votes"), where("matchId", "==", match.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllVotes(list);
    }, (err) => {
      console.error(err);
    });
    return () => unsubscribe();
  }, [match.id]);

  const kickoff = match.matchDate?.toDate ? match.matchDate.toDate() : new Date(match.matchDate);
  const isKickoffValid = kickoff && !isNaN(kickoff.getTime());
  const isLocked = (match.status !== "upcoming" || (isKickoffValid && now >= kickoff)) && !match.forceUnlocked;
  const totalVotes = match.votes?.total || 0;

  const getPercent = (key) => {
    if (totalVotes === 0) return 0;
    return Math.round(((match.votes?.[key] || 0) / totalVotes) * 100);
  };

  const pctA = getPercent("teamA");
  const pctDraw = getPercent("draw");
  const pctB = getPercent("teamB");

  const handleVote = async (vote) => {
    if (!user || isLocked || voting || (isAdmin && (!selectedUserId || selectedUserId === user.uid))) return;
    try {
      if (vote === userVote) {
        // Tích thêm 1 lần là hủy chọn
        await cancelVote();
      } else {
        const targetUser = selectedUserId === user.uid
          ? user
          : usersList.find(u => u.uid === selectedUserId);
        const targetName = targetUser?.displayName || targetUser?.email || "Người chơi";
        const targetPhoto = targetUser?.photoURL || null;

        await castVote(vote, targetName, targetPhoto);
      }
    } catch (error) {
      alert(error.message || "Không thể bình chọn. Vui lòng thử lại.");
    }
  };

  if (loading) {
    return <div className="vote-widget vote-widget--loading">Đang tải...</div>;
  }

  // Vô hiệu hóa nút bấm khi: Đã khóa, Đang gửi, Chưa đăng nhập (Không khóa khi đã vote để người dùng đổi hoặc hủy)
  const isDisabled = isLocked || voting || !user || (isAdmin && (!selectedUserId || selectedUserId === user.uid));

  const teamAVoters = allVotes.filter(v => v.vote === "teamA").map(v => v.userName || "Ẩn danh");
  const drawVoters = allVotes.filter(v => v.vote === "draw").map(v => v.userName || "Ẩn danh");
  const teamBVoters = allVotes.filter(v => v.vote === "teamB").map(v => v.userName || "Ẩn danh");

  const votedUserIds = new Set(allVotes.map(v => v.userId));
  const nonVoters = usersList
    .filter(u => {
      if (votedUserIds.has(u.uid)) return false;
      const userCreatedAt = u.createdAt?.toDate 
        ? u.createdAt.toDate() 
        : (u.createdAt ? new Date(u.createdAt) : new Date(0));
      return isKickoffValid && userCreatedAt <= kickoff;
    })
    .map(u => u.displayName);

  return (
    <div className="vote-widget">
      {/* Admin vote select */}
      {isAdmin && usersList.length > 0 && (
        <div className="admin-vote-select" style={{ marginBottom: "12px", fontSize: "0.82rem", display: "flex", alignItems: "center" }}>
          <label style={{ color: "var(--text-secondary)", marginRight: "8px", fontWeight: "600" }}>👤 Bình chọn hộ:</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "4px",
              color: "var(--text-primary)",
              padding: "4px 8px",
              outline: "none",
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            <option value="" style={{ color: "#000", background: "#fff" }}>
              -- Chọn người chơi (None) --
            </option>
            {usersList.map(u => (
              <option key={u.uid} value={u.uid} style={{ color: "#000", background: "#fff" }}>
                {u.displayName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Vote buttons */}
      <div className="vote-buttons">
        <button
          className={`vote-btn vote-btn--teamA ${userVote === "teamA" ? "vote-btn--selected" : ""} ${isDisabled ? "vote-btn--disabled" : ""}`}
          onClick={() => handleVote("teamA")}
          disabled={isDisabled}
          title={!user ? "Đăng nhập để bình chọn" : ""}
        >
          <span className="vote-btn-label">{match.teamA.name}</span>
          <span className="vote-btn-pct">{pctA}%</span>
        </button>

        <button
          className={`vote-btn vote-btn--draw ${userVote === "draw" ? "vote-btn--selected" : ""} ${isDisabled ? "vote-btn--disabled" : ""}`}
          onClick={() => handleVote("draw")}
          disabled={isDisabled}
          title={!user ? "Đăng nhập để bình chọn" : ""}
        >
          <span className="vote-btn-label">Hòa</span>
          <span className="vote-btn-pct">{pctDraw}%</span>
        </button>

        <button
          className={`vote-btn vote-btn--teamB ${userVote === "teamB" ? "vote-btn--selected" : ""} ${isDisabled ? "vote-btn--disabled" : ""}`}
          onClick={() => handleVote("teamB")}
          disabled={isDisabled}
          title={!user ? "Đăng nhập để bình chọn" : ""}
        >
          <span className="vote-btn-label">{match.teamB.name}</span>
          <span className="vote-btn-pct">{pctB}%</span>
        </button>
      </div>

      {/* Progress bars */}
      <div className="vote-bars">
        <div className="vote-bar">
          <div
            className="vote-bar-fill vote-bar-fill--teamA"
            style={{ width: `${pctA}%` }}
          ></div>
        </div>
        <div className="vote-bar">
          <div
            className="vote-bar-fill vote-bar-fill--draw"
            style={{ width: `${pctDraw}%` }}
          ></div>
        </div>
        <div className="vote-bar">
          <div
            className="vote-bar-fill vote-bar-fill--teamB"
            style={{ width: `${pctB}%` }}
          ></div>
        </div>
      </div>

      {/* Status message */}
      <div className="vote-status">
        {voting && <span className="vote-status-text">⏳ Đang gửi...</span>}
        {!user && <span className="vote-status-text">🔒 Đăng nhập để bình chọn</span>}
        {isLocked && <span className="vote-status-text">🔒 Đã khóa bình chọn</span>}
        {userVote && !isLocked && (
          <span className="vote-status-text vote-status-text--success">
            ✅ Đã bình chọn{" "}
            <button
              type="button"
              className="vote-change-link"
              onClick={() => handleVote(userVote)}
              disabled={voting}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-gold)",
                textDecoration: "underline",
                fontSize: "0.75rem",
                marginLeft: "6px",
                cursor: "pointer",
                display: "inline",
                padding: 0
              }}
            >
              (Vote lại)
            </button>
          </span>
        )}
        {totalVotes > 0 && (
          <span className="vote-total">{totalVotes.toLocaleString("vi-VN")} lượt bình chọn</span>
        )}
      </div>

      {/* List of voters and non-voters */}
      {usersList.length > 0 && (
        <div className="voters-lists" style={{
          marginTop: "14px",
          borderTop: "1px dashed var(--border-subtle)",
          paddingTop: "10px",
          fontSize: "0.72rem",
          display: "flex",
          flexDirection: "column",
          gap: "6px"
        }}>
          {allVotes.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <span style={{ color: "var(--accent-blue)", fontWeight: "600", minWidth: "80px", flexShrink: 0 }}>{match.teamA.name}:</span>
                <span style={{ color: "var(--text-secondary)", wordBreak: "break-word" }}>
                  {teamAVoters.length > 0 ? teamAVoters.join(", ") : "Chưa có"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <span style={{ color: "var(--accent-purple)", fontWeight: "600", minWidth: "80px", flexShrink: 0 }}>Hòa:</span>
                <span style={{ color: "var(--text-secondary)", wordBreak: "break-word" }}>
                  {drawVoters.length > 0 ? drawVoters.join(", ") : "Chưa có"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                <span style={{ color: "var(--accent-green)", fontWeight: "600", minWidth: "80px", flexShrink: 0 }}>{match.teamB.name}:</span>
                <span style={{ color: "var(--text-secondary)", wordBreak: "break-word" }}>
                  {teamBVoters.length > 0 ? teamBVoters.join(", ") : "Chưa có"}
                </span>
              </div>
            </>
          )}
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "6px",
            borderTop: allVotes.length > 0 ? "1px dashed rgba(255, 255, 255, 0.05)" : "none",
            paddingTop: allVotes.length > 0 ? "6px" : "0"
          }}>
            <span style={{ color: "#f59e0b", fontWeight: "600", minWidth: "80px", flexShrink: 0 }}>Chưa vote:</span>
            <span style={{ color: "var(--text-secondary)", wordBreak: "break-word", fontStyle: "italic" }}>
              {nonVoters.length > 0 ? nonVoters.join(", ") : "Tất cả đã vote"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
