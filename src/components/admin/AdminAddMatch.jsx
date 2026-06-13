import { useState } from "react";
import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";

const WORLD_CUP_TEAMS = [
  { name: "Argentina", code: "ARG", flag: "ar" },
  { name: "Brazil", code: "BRA", flag: "br" },
  { name: "Đức", code: "GER", flag: "de" },
  { name: "Pháp", code: "FRA", flag: "fr" },
  { name: "Anh", code: "ENG", flag: "gb-eng" },
  { name: "Tây Ban Nha", code: "ESP", flag: "es" },
  { name: "Bồ Đào Nha", code: "POR", flag: "pt" },
  { name: "Hà Lan", code: "NED", flag: "nl" },
  { name: "Ý", code: "ITA", flag: "it" },
  { name: "Bỉ", code: "BEL", flag: "be" },
  { name: "Croatia", code: "CRO", flag: "hr" },
  { name: "Uruguay", code: "URU", flag: "uy" },
  { name: "Mỹ", code: "USA", flag: "us" },
  { name: "Mexico", code: "MEX", flag: "mx" },
  { name: "Canada", code: "CAN", flag: "ca" },
  { name: "Nhật Bản", code: "JPN", flag: "jp" },
  { name: "Hàn Quốc", code: "KOR", flag: "kr" },
  { name: "Úc", code: "AUS", flag: "au" },
  { name: "Iran", code: "IRN", flag: "ir" },
  { name: "Ả Rập Saudi", code: "KSA", flag: "sa" },
  { name: "Morocco", code: "MAR", flag: "ma" },
  { name: "Senegal", code: "SEN", flag: "sn" },
  { name: "Tunisia", code: "TUN", flag: "tn" },
  { name: "Thụy Sĩ", code: "SUI", flag: "ch" },
  { name: "Đan Mạch", code: "DEN", flag: "dk" },
  { name: "Ba Lan", code: "POL", flag: "pl" },
  { name: "Thụy Điển", code: "SWE", flag: "se" },
  { name: "Thổ Nhĩ Kỳ", code: "TUR", flag: "tr" },
  { name: "Ecuador", code: "ECU", flag: "ec" },
  { name: "Colombia", code: "COL", flag: "co" },
  { name: "Peru", code: "PER", flag: "pe" },
  { name: "Chile", code: "CHI", flag: "cl" },
  { name: "Ghana", code: "GHA", flag: "gh" },
  { name: "Cameroon", code: "CMR", flag: "cm" },
  { name: "Ukraine", code: "UKR", flag: "ua" },
  { name: "Áo", code: "AUT", flag: "at" },
  { name: "CH Séc", code: "CZE", flag: "cz" },
  { name: "Hungary", code: "HUN", flag: "hu" },
  { name: "Rumani", code: "ROU", flag: "ro" },
  { name: "Slovakia", code: "SVK", flag: "sk" },
  { name: "Algeria", code: "ALG", flag: "dz" },
  { name: "Bosnia & Herzegovina", code: "BIH", flag: "ba" },
  { name: "Paraguay", code: "PAR", flag: "py" },
  { name: "Haiti", code: "HAI", flag: "ht" },
  { name: "Qatar", code: "QAT", flag: "qa" },
  { name: "Scotland", code: "SCO", flag: "gb-sct" },
  { name: "Panama", code: "PAN", flag: "pa" },
  { name: "Curaçao", code: "CUR", flag: "cw" },
  { name: "Bờ Biển Ngà", code: "CIV", flag: "ci" },
  { name: "Ai Cập", code: "EGY", flag: "eg" },
  { name: "New Zealand", code: "NZL", flag: "nz" },
  { name: "Cabo Verde", code: "CPV", flag: "cv" },
  { name: "Iraq", code: "IRQ", flag: "iq" },
  { name: "Na Uy", code: "NOR", flag: "no" },
].sort((a, b) => a.name.localeCompare(b.name));

const VENUES = [
  "MetLife Stadium (New York New Jersey)",
  "Azteca Stadium (Mexico City)",
  "SoFi Stadium (Los Angeles)",
  "Mercedes-Benz Stadium (Atlanta)",
  "Hard Rock Stadium (Miami)",
  "Gillette Stadium (Boston)",
  "Lincoln Financial Field (Philadelphia)",
  "Lumen Field (Seattle)",
  "Levi's Stadium (San Francisco)",
  "Arrowhead Stadium (Kansas City)",
  "AT&T Stadium (Dallas)",
  "NRG Stadium (Houston)",
  "BC Place (Vancouver)",
  "Toronto Stadium (Toronto)",
  "Estadio BBVA (Monterrey)",
  "Estadio Akron (Guadalajara)"
].sort();

export default function AdminAddMatch() {
  const [groupOrPhase, setGroupOrPhase] = useState("Vòng bảng");
  const [matchDateStr, setMatchDateStr] = useState("");
  const [venue, setVenue] = useState("");
  const [customMatchId, setCustomMatchId] = useState("");

  // Team A states
  const [teamAName, setTeamAName] = useState("");
  const [teamACode, setTeamACode] = useState("");
  const [teamAFlag, setTeamAFlag] = useState("");

  // Team B states
  const [teamBName, setTeamBName] = useState("");
  const [teamBCode, setTeamBCode] = useState("");
  const [teamBFlag, setTeamBFlag] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAutofillTeamA = (teamCode) => {
    if (!teamCode) return;
    const selected = WORLD_CUP_TEAMS.find(t => t.code === teamCode);
    if (selected) {
      setTeamAName(selected.name);
      setTeamACode(selected.code);
      setTeamAFlag(selected.flag);
    }
  };

  const handleAutofillTeamB = (teamCode) => {
    if (!teamCode) return;
    const selected = WORLD_CUP_TEAMS.find(t => t.code === teamCode);
    if (selected) {
      setTeamBName(selected.name);
      setTeamBCode(selected.code);
      setTeamBFlag(selected.flag);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!teamAName || !teamACode || !teamAFlag || !teamBName || !teamBCode || !teamBFlag || !matchDateStr || !venue) {
      setError("Vui lòng nhập đầy đủ các thông tin bắt buộc.");
      return;
    }

    setLoading(true);

    try {
      const parsedDate = new Date(matchDateStr);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Ngày giờ thi đấu không hợp lệ.");
      }

      // Đảm bảo mã cờ được format chuẩn
      const flagCodeA = teamAFlag.trim().toLowerCase();
      const flagCodeB = teamBFlag.trim().toLowerCase();

      const matchData = {
        teamA: {
          name: teamAName.trim(),
          code: teamACode.trim().toUpperCase(),
          flag: `https://flagcdn.com/w80/${flagCodeA}.png`
        },
        teamB: {
          name: teamBName.trim(),
          code: teamBCode.trim().toUpperCase(),
          flag: `https://flagcdn.com/w80/${flagCodeB}.png`
        },
        group: groupOrPhase.trim(),
        matchDate: Timestamp.fromDate(parsedDate),
        venue: venue.trim(),
        status: "upcoming",
        result: null,
        scoreA: null,
        scoreB: null,
        votes: { teamA: 0, draw: 0, teamB: 0, total: 0 }
      };

      const matchId = customMatchId.trim() || doc(collection(db, "matches")).id;
      
      await setDoc(doc(db, "matches", matchId), matchData);

      setSuccess(`🎉 Tạo trận đấu thành công: ${teamAName} VS ${teamBName} (${groupOrPhase})`);
      
      // Reset form
      setCustomMatchId("");
      setTeamAName("");
      setTeamACode("");
      setTeamAFlag("");
      setTeamBName("");
      setTeamBCode("");
      setTeamBFlag("");
      setMatchDateStr("");
      setVenue("");
    } catch (err) {
      console.error("Error creating match:", err);
      setError(err.message || "Đã xảy ra lỗi khi tạo trận đấu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-add-match-page" style={{ padding: "20px 10px" }}>
      <div className="login-card" style={{ maxWidth: "700px", margin: "20px auto", padding: "30px" }}>
        <div className="login-header">
          <div className="login-logo">
            <span className="login-logo-icon">➕</span>
          </div>
          <h1 className="login-title">Thêm Trận Đấu Mới</h1>
          <p className="login-subtitle">Tạo thêm các trận đấu vòng loại trực tiếp (Tứ kết, Bán kết, Chung kết...)</p>
          <div className="login-divider">
            <span className="login-divider-star">★</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error-msg">{error}</div>}
          {success && (
            <div className="auth-error-msg" style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
              {success}
            </div>
          )}

          {/* Hàng 1: Vòng đấu & Sân vận động */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div className="form-group" style={{ flex: "1", minWidth: "200px" }}>
              <label className="form-label" htmlFor="groupOrPhase">Vòng đấu / Giai đoạn</label>
              <input
                type="text"
                id="groupOrPhase"
                list="phases-list"
                value={groupOrPhase}
                onChange={(e) => setGroupOrPhase(e.target.value)}
                placeholder="Ví dụ: Tứ kết, Bán kết..."
                required
                className="form-input"
              />
              <datalist id="phases-list">
                <option value="Vòng bảng" />
                <option value="Vòng 32 đội" />
                <option value="Vòng 16 đội" />
                <option value="Tứ kết" />
                <option value="Bán kết" />
                <option value="Tranh hạng ba" />
                <option value="Chung kết" />
              </datalist>
            </div>

            <div className="form-group" style={{ flex: "1", minWidth: "200px" }}>
              <label className="form-label" htmlFor="venue">Sân vận động</label>
              <input
                type="text"
                id="venue"
                list="venues-list"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Tên sân vận động..."
                required
                className="form-input"
              />
              <datalist id="venues-list">
                {VENUES.map(v => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Hàng 2: Thời gian kickoff & ID tùy chọn */}
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <div className="form-group" style={{ flex: "1", minWidth: "200px" }}>
              <label className="form-label" htmlFor="matchDate">Thời gian thi đấu (Giờ VN)</label>
              <input
                type="datetime-local"
                id="matchDate"
                value={matchDateStr}
                onChange={(e) => setMatchDateStr(e.target.value)}
                required
                className="form-input"
                style={{ colorScheme: "dark" }}
              />
            </div>

            <div className="form-group" style={{ flex: "1", minWidth: "200px" }}>
              <label className="form-label" htmlFor="customMatchId">Mã trận đấu (Tùy chọn)</label>
              <input
                type="text"
                id="customMatchId"
                value={customMatchId}
                onChange={(e) => setCustomMatchId(e.target.value)}
                placeholder="Ví dụ: QF1, SF2 (để trống tự tạo)"
                className="form-input"
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginTop: "10px" }}>
            {/* Đội A */}
            <div style={{
              flex: "1",
              minWidth: "280px",
              padding: "16px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px"
            }}>
              <h3 style={{ color: "var(--accent-gold)", marginBottom: "12px", fontSize: "0.95rem", fontWeight: "bold" }}>Đội A (Chủ nhà)</h3>
              
              <div className="form-group" style={{ marginBottom: "10px" }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Chọn nhanh quốc gia</label>
                <select
                  onChange={(e) => handleAutofillTeamA(e.target.value)}
                  defaultValue=""
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "4px",
                    color: "#111827", // Black text for option contrast
                    padding: "4px 8px",
                    width: "100%",
                    outline: "none",
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  <option value="" style={{ color: "#111827" }}>-- Chọn đội --</option>
                  {WORLD_CUP_TEAMS.map(t => (
                    <option key={t.code} value={t.code} style={{ color: "#111827" }}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "10px" }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Tên Đội A</label>
                <input
                  type="text"
                  value={teamAName}
                  onChange={(e) => setTeamAName(e.target.value)}
                  placeholder="Ví dụ: Argentina, Thắng QF1..."
                  required
                  className="form-input"
                  style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.78rem" }}>Mã 3 chữ (ARG)</label>
                  <input
                    type="text"
                    value={teamACode}
                    onChange={(e) => setTeamACode(e.target.value)}
                    placeholder="Mã Đội"
                    required
                    className="form-input"
                    maxLength={5}
                    style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.78rem" }}>Mã Cờ (ar)</label>
                  <input
                    type="text"
                    value={teamAFlag}
                    onChange={(e) => setTeamAFlag(e.target.value)}
                    placeholder="Mã Cờ"
                    required
                    className="form-input"
                    style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                  />
                </div>
              </div>
            </div>

            {/* Đội B */}
            <div style={{
              flex: "1",
              minWidth: "280px",
              padding: "16px",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px"
            }}>
              <h3 style={{ color: "var(--accent-gold)", marginBottom: "12px", fontSize: "0.95rem", fontWeight: "bold" }}>Đội B (Khách)</h3>
              
              <div className="form-group" style={{ marginBottom: "10px" }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Chọn nhanh quốc gia</label>
                <select
                  onChange={(e) => handleAutofillTeamB(e.target.value)}
                  defaultValue=""
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "4px",
                    color: "#111827",
                    padding: "4px 8px",
                    width: "100%",
                    outline: "none",
                    fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  <option value="" style={{ color: "#111827" }}>-- Chọn đội --</option>
                  {WORLD_CUP_TEAMS.map(t => (
                    <option key={t.code} value={t.code} style={{ color: "#111827" }}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: "10px" }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Tên Đội B</label>
                <input
                  type="text"
                  value={teamBName}
                  onChange={(e) => setTeamBName(e.target.value)}
                  placeholder="Ví dụ: Brazil, Nhì Bảng B..."
                  required
                  className="form-input"
                  style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.78rem" }}>Mã 3 chữ (BRA)</label>
                  <input
                    type="text"
                    value={teamBCode}
                    onChange={(e) => setTeamBCode(e.target.value)}
                    placeholder="Mã Đội"
                    required
                    className="form-input"
                    maxLength={5}
                    style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                  />
                </div>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: "0.78rem" }}>Mã Cờ (br)</label>
                  <input
                    type="text"
                    value={teamBFlag}
                    onChange={(e) => setTeamBFlag(e.target.value)}
                    placeholder="Mã Cờ"
                    required
                    className="form-input"
                    style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="login-btn auth-submit-btn"
            style={{ marginTop: "24px" }}
          >
            {loading ? (
              <span className="spinner spinner-btn"></span>
            ) : (
              "Thêm trận đấu mới"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
