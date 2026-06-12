import { useAuth } from "../../contexts/AuthContext";
import { useVote } from "../../hooks/useVotes";

/**
 * Widget bình chọn cho mỗi trận đấu.
 * - 3 nút: Đội A thắng / Hòa / Đội B thắng
 * - Progress bar realtime hiển thị tỷ lệ %
 * - Khóa bình chọn khi trận đã diễn ra
 */
export default function VoteWidget({ match }) {
  const { user } = useAuth();
  const { userVote, loading, voting, castVote } = useVote(
    match.id,
    user?.uid
  );

  const isLocked = (match.status !== "upcoming" || new Date() >= new Date(match.matchDate)) && !match.forceUnlocked;
  const totalVotes = match.votes?.total || 0;

  const getPercent = (key) => {
    if (totalVotes === 0) return 0;
    return Math.round(((match.votes?.[key] || 0) / totalVotes) * 100);
  };

  const pctA = getPercent("teamA");
  const pctDraw = getPercent("draw");
  const pctB = getPercent("teamB");

  const handleVote = async (vote) => {
    if (!user || isLocked || userVote || voting) return;
    try {
      await castVote(vote, user.displayName, user.photoURL);
    } catch (error) {
      alert(error.message || "Không thể bình chọn. Vui lòng thử lại.");
    }
  };

  if (loading) {
    return <div className="vote-widget vote-widget--loading">Đang tải...</div>;
  }

  return (
    <div className="vote-widget">
      {/* Vote buttons */}
      <div className="vote-buttons">
        <button
          className={`vote-btn vote-btn--teamA ${userVote === "teamA" ? "vote-btn--selected" : ""} ${isLocked || (userVote && userVote !== "teamA") ? "vote-btn--disabled" : ""}`}
          onClick={() => handleVote("teamA")}
          disabled={isLocked || !!userVote || voting || !user}
          title={!user ? "Đăng nhập để bình chọn" : ""}
        >
          <span className="vote-btn-label">{match.teamA.name}</span>
          <span className="vote-btn-pct">{pctA}%</span>
        </button>

        <button
          className={`vote-btn vote-btn--draw ${userVote === "draw" ? "vote-btn--selected" : ""} ${isLocked || (userVote && userVote !== "draw") ? "vote-btn--disabled" : ""}`}
          onClick={() => handleVote("draw")}
          disabled={isLocked || !!userVote || voting || !user}
          title={!user ? "Đăng nhập để bình chọn" : ""}
        >
          <span className="vote-btn-label">Hòa</span>
          <span className="vote-btn-pct">{pctDraw}%</span>
        </button>

        <button
          className={`vote-btn vote-btn--teamB ${userVote === "teamB" ? "vote-btn--selected" : ""} ${isLocked || (userVote && userVote !== "teamB") ? "vote-btn--disabled" : ""}`}
          onClick={() => handleVote("teamB")}
          disabled={isLocked || !!userVote || voting || !user}
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
            ✅ Đã bình chọn
          </span>
        )}
        {totalVotes > 0 && (
          <span className="vote-total">{totalVotes.toLocaleString("vi-VN")} lượt bình chọn</span>
        )}
      </div>
    </div>
  );
}
