import VoteWidget from "./VoteWidget";

/**
 * Card hiển thị thông tin một trận đấu.
 * Bao gồm: Cờ quốc gia, tên đội, tỷ số, thời gian, và VoteWidget.
 */
export default function MatchCard({ match }) {
  const formatDate = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getStatusBadge = () => {
    switch (match.status) {
      case "live":
        return <span className="badge badge--live">🔴 LIVE</span>;
      case "finished":
        return <span className="badge badge--finished">Kết thúc</span>;
      default:
        return <span className="badge badge--upcoming">Sắp diễn ra</span>;
    }
  };

  const getResultLabel = () => {
    if (match.status !== "finished" || !match.result) return null;
    switch (match.result) {
      case "teamA":
        return match.teamA.name + " thắng";
      case "teamB":
        return match.teamB.name + " thắng";
      case "draw":
        return "Hòa";
      default:
        return null;
    }
  };

  return (
    <div className={`match-card ${match.status === "live" ? "match-card--live" : ""}`}>
      {/* Header: Group + Status */}
      <div className="match-card-header">
        <span className="match-group">{match.group}</span>
        {getStatusBadge()}
      </div>

      {/* Teams section */}
      <div className="match-teams">
        {/* Team A */}
        <div className={`match-team ${match.result === "teamA" ? "match-team--winner" : ""}`}>
          <img
            src={match.teamA.flag}
            alt={match.teamA.name}
            className="team-flag"
            loading="lazy"
          />
          <span className="team-name">{match.teamA.name}</span>
        </div>

        {/* Score / VS */}
        <div className="match-score-area">
          {match.status === "finished" || match.status === "live" ? (
            <div className="match-score">
              <span className="score-num">{match.scoreA ?? "-"}</span>
              <span className="score-separator">:</span>
              <span className="score-num">{match.scoreB ?? "-"}</span>
            </div>
          ) : (
            <div className="match-vs">VS</div>
          )}
        </div>

        {/* Team B */}
        <div className={`match-team ${match.result === "teamB" ? "match-team--winner" : ""}`}>
          <img
            src={match.teamB.flag}
            alt={match.teamB.name}
            className="team-flag"
            loading="lazy"
          />
          <span className="team-name">{match.teamB.name}</span>
        </div>
      </div>

      {/* Match result label */}
      {getResultLabel() && (
        <div className="match-result-label">🏆 {getResultLabel()}</div>
      )}

      {/* Match info */}
      <div className="match-info">
        <span className="match-datetime">
          📅 {formatDate(match.matchDate)} &bull; 🕐 {formatTime(match.matchDate)}
        </span>
        <span className="match-venue">📍 {match.venue}</span>
      </div>

      {/* Vote widget */}
      <VoteWidget match={match} />
    </div>
  );
}
