/**
 * Dữ liệu đầy đủ lịch thi đấu vòng bảng World Cup 2026
 * 48 đội, 12 bảng (A-L), 72 trận
 * 
 * Giờ kickoff theo giờ Việt Nam (UTC+7)
 * Flag URL: https://flagcdn.com/w80/{iso-code}.png
 */

export const getFlagUrl = (code) => `https://flagcdn.com/w80/${code}.png`;

// === TEAM DATA ===
const T = {
  // Group A
  MEX: { name: "Mexico", code: "mx" },
  RSA: { name: "Nam Phi", code: "za" },
  KOR: { name: "Hàn Quốc", code: "kr" },
  CZE: { name: "Czechia", code: "cz" },
  // Group B
  CAN: { name: "Canada", code: "ca" },
  BIH: { name: "Bosnia & Herzegovina", code: "ba" },
  QAT: { name: "Qatar", code: "qa" },
  SUI: { name: "Thụy Sĩ", code: "ch" },
  // Group C
  BRA: { name: "Brazil", code: "br" },
  MAR: { name: "Morocco", code: "ma" },
  HAI: { name: "Haiti", code: "ht" },
  SCO: { name: "Scotland", code: "gb-sct" },
  // Group D
  USA: { name: "Mỹ", code: "us" },
  PAR: { name: "Paraguay", code: "py" },
  AUS: { name: "Úc", code: "au" },
  TUR: { name: "Thổ Nhĩ Kỳ", code: "tr" },
  // Group E
  GER: { name: "Đức", code: "de" },
  CUR: { name: "Curaçao", code: "cw" },
  CIV: { name: "Bờ Biển Ngà", code: "ci" },
  ECU: { name: "Ecuador", code: "ec" },
  // Group F
  NED: { name: "Hà Lan", code: "nl" },
  JPN: { name: "Nhật Bản", code: "jp" },
  SWE: { name: "Thụy Điển", code: "se" },
  TUN: { name: "Tunisia", code: "tn" },
  // Group G
  BEL: { name: "Bỉ", code: "be" },
  EGY: { name: "Ai Cập", code: "eg" },
  IRN: { name: "Iran", code: "ir" },
  NZL: { name: "New Zealand", code: "nz" },
  // Group H
  ESP: { name: "Tây Ban Nha", code: "es" },
  CPV: { name: "Cabo Verde", code: "cv" },
  KSA: { name: "Ả Rập Saudi", code: "sa" },
  URU: { name: "Uruguay", code: "uy" },
  // Group I
  FRA: { name: "Pháp", code: "fr" },
  SEN: { name: "Senegal", code: "sn" },
  IRQ: { name: "Iraq", code: "iq" },
  NOR: { name: "Na Uy", code: "no" },
  // Group J
  ARG: { name: "Argentina", code: "ar" },
  ALG: { name: "Algeria", code: "dz" },
  AUT: { name: "Áo", code: "at" },
  JOR: { name: "Jordan", code: "jo" },
  // Group K
  POR: { name: "Bồ Đào Nha", code: "pt" },
  COD: { name: "CHDC Congo", code: "cd" },
  UZB: { name: "Uzbekistan", code: "uz" },
  COL: { name: "Colombia", code: "co" },
  // Group L
  ENG: { name: "Anh", code: "gb-eng" },
  CRO: { name: "Croatia", code: "hr" },
  GHA: { name: "Ghana", code: "gh" },
  PAN: { name: "Panama", code: "pa" },
};

const team = (t) => ({
  name: t.name,
  code: Object.keys(T).find((k) => T[k] === t),
  flag: getFlagUrl(t.code),
});

const emptyVotes = () => ({ teamA: 0, draw: 0, teamB: 0, total: 0 });
const randomVotes = () => emptyVotes();

// ============================================================
//  FULL GROUP STAGE SCHEDULE - 72 MATCHES
//  Giờ Việt Nam (UTC+7)
// ============================================================

export const seedMatches = [
  // ========================================
  //  MATCHDAY 1 — June 11–17
  // ========================================

  // --- June 11 ---
  {
    id: "A1",
    teamA: team(T.MEX), teamB: team(T.RSA),
    group: "Bảng A", matchDate: new Date("2026-06-12T02:00:00+07:00"),
    venue: "Mexico City Stadium", status: "finished",
    result: "teamA", scoreA: 1, scoreB: 0,
    votes: emptyVotes(),
  },
  {
    id: "A2",
    teamA: team(T.KOR), teamB: team(T.CZE),
    group: "Bảng A", matchDate: new Date("2026-06-12T09:00:00+07:00"),
    venue: "Guadalajara Stadium", status: "live",
    result: null, scoreA: 0, scoreB: 0,
    votes: emptyVotes(),
  },

  // --- June 12 ---
  {
    id: "B1",
    teamA: team(T.CAN), teamB: team(T.BIH),
    group: "Bảng B", matchDate: new Date("2026-06-13T02:00:00+07:00"),
    venue: "Toronto Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "D1",
    teamA: team(T.USA), teamB: team(T.PAR),
    group: "Bảng D", matchDate: new Date("2026-06-13T08:00:00+07:00"),
    venue: "Los Angeles Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },

  // --- June 13 ---
  {
    id: "C1",
    teamA: team(T.HAI), teamB: team(T.SCO),
    group: "Bảng C", matchDate: new Date("2026-06-14T08:00:00+07:00"),
    venue: "Boston Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "D2",
    teamA: team(T.AUS), teamB: team(T.TUR),
    group: "Bảng D", matchDate: new Date("2026-06-14T11:00:00+07:00"),
    venue: "Vancouver Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "C2",
    teamA: team(T.BRA), teamB: team(T.MAR),
    group: "Bảng C", matchDate: new Date("2026-06-14T05:00:00+07:00"),
    venue: "New York New Jersey Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "B2",
    teamA: team(T.QAT), teamB: team(T.SUI),
    group: "Bảng B", matchDate: new Date("2026-06-14T02:00:00+07:00"),
    venue: "San Francisco Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },

  // --- June 14 ---
  {
    id: "E1",
    teamA: team(T.CIV), teamB: team(T.ECU),
    group: "Bảng E", matchDate: new Date("2026-06-15T06:00:00+07:00"),
    venue: "Philadelphia Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "E2",
    teamA: team(T.GER), teamB: team(T.CUR),
    group: "Bảng E", matchDate: new Date("2026-06-15T00:00:00+07:00"),
    venue: "Houston Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "F1",
    teamA: team(T.NED), teamB: team(T.JPN),
    group: "Bảng F", matchDate: new Date("2026-06-15T03:00:00+07:00"),
    venue: "Dallas Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "F2",
    teamA: team(T.SWE), teamB: team(T.TUN),
    group: "Bảng F", matchDate: new Date("2026-06-15T09:00:00+07:00"),
    venue: "Monterrey Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },

  // --- June 15 ---
  {
    id: "H1",
    teamA: team(T.KSA), teamB: team(T.URU),
    group: "Bảng H", matchDate: new Date("2026-06-16T05:00:00+07:00"),
    venue: "Miami Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "H2",
    teamA: team(T.ESP), teamB: team(T.CPV),
    group: "Bảng H", matchDate: new Date("2026-06-15T23:00:00+07:00"),
    venue: "Atlanta Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "G1",
    teamA: team(T.IRN), teamB: team(T.NZL),
    group: "Bảng G", matchDate: new Date("2026-06-16T08:00:00+07:00"),
    venue: "Los Angeles Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "G2",
    teamA: team(T.BEL), teamB: team(T.EGY),
    group: "Bảng G", matchDate: new Date("2026-06-16T02:00:00+07:00"),
    venue: "Seattle Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },

  // --- June 16 ---
  {
    id: "I1",
    teamA: team(T.FRA), teamB: team(T.SEN),
    group: "Bảng I", matchDate: new Date("2026-06-17T02:00:00+07:00"),
    venue: "New York New Jersey Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "I2",
    teamA: team(T.IRQ), teamB: team(T.NOR),
    group: "Bảng I", matchDate: new Date("2026-06-17T05:00:00+07:00"),
    venue: "Boston Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "J1",
    teamA: team(T.ARG), teamB: team(T.ALG),
    group: "Bảng J", matchDate: new Date("2026-06-17T08:00:00+07:00"),
    venue: "Kansas City Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "J2",
    teamA: team(T.AUT), teamB: team(T.JOR),
    group: "Bảng J", matchDate: new Date("2026-06-17T11:00:00+07:00"),
    venue: "San Francisco Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },

  // --- June 17 ---
  {
    id: "L1",
    teamA: team(T.GHA), teamB: team(T.PAN),
    group: "Bảng L", matchDate: new Date("2026-06-18T06:00:00+07:00"),
    venue: "Toronto Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "L2",
    teamA: team(T.ENG), teamB: team(T.CRO),
    group: "Bảng L", matchDate: new Date("2026-06-18T03:00:00+07:00"),
    venue: "Dallas Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "K1",
    teamA: team(T.POR), teamB: team(T.COD),
    group: "Bảng K", matchDate: new Date("2026-06-18T00:00:00+07:00"),
    venue: "Houston Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },
  {
    id: "K2",
    teamA: team(T.UZB), teamB: team(T.COL),
    group: "Bảng K", matchDate: new Date("2026-06-18T09:00:00+07:00"),
    venue: "Mexico City Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: randomVotes(),
  },

  // ========================================
  //  MATCHDAY 2 — June 18–23
  // ========================================

  // --- June 18 ---
  {
    id: "A3",
    teamA: team(T.CZE), teamB: team(T.RSA),
    group: "Bảng A", matchDate: new Date("2026-06-18T23:00:00+07:00"),
    venue: "Atlanta Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "B3",
    teamA: team(T.SUI), teamB: team(T.BIH),
    group: "Bảng B", matchDate: new Date("2026-06-19T02:00:00+07:00"),
    venue: "Los Angeles Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // --- June 19 ---
  {
    id: "B4",
    teamA: team(T.CAN), teamB: team(T.QAT),
    group: "Bảng B", matchDate: new Date("2026-06-19T05:00:00+07:00"),
    venue: "Vancouver Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "A4",
    teamA: team(T.MEX), teamB: team(T.KOR),
    group: "Bảng A", matchDate: new Date("2026-06-19T08:00:00+07:00"),
    venue: "Guadalajara Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "D3",
    teamA: team(T.USA), teamB: team(T.AUS),
    group: "Bảng D", matchDate: new Date("2026-06-20T02:00:00+07:00"),
    venue: "Seattle Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // --- June 20 ---
  {
    id: "C3",
    teamA: team(T.SCO), teamB: team(T.MAR),
    group: "Bảng C", matchDate: new Date("2026-06-20T05:00:00+07:00"),
    venue: "Boston Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "C4",
    teamA: team(T.BRA), teamB: team(T.HAI),
    group: "Bảng C", matchDate: new Date("2026-06-20T07:30:00+07:00"),
    venue: "Philadelphia Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "D4",
    teamA: team(T.TUR), teamB: team(T.PAR),
    group: "Bảng D", matchDate: new Date("2026-06-20T10:00:00+07:00"),
    venue: "San Francisco Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "F3",
    teamA: team(T.NED), teamB: team(T.SWE),
    group: "Bảng F", matchDate: new Date("2026-06-21T00:00:00+07:00"),
    venue: "Houston Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "E3",
    teamA: team(T.GER), teamB: team(T.CIV),
    group: "Bảng E", matchDate: new Date("2026-06-21T03:00:00+07:00"),
    venue: "Toronto Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // --- June 21 ---
  {
    id: "E4",
    teamA: team(T.ECU), teamB: team(T.CUR),
    group: "Bảng E", matchDate: new Date("2026-06-21T07:00:00+07:00"),
    venue: "Kansas City Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "F4",
    teamA: team(T.TUN), teamB: team(T.JPN),
    group: "Bảng F", matchDate: new Date("2026-06-21T11:00:00+07:00"),
    venue: "Monterrey Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "H3",
    teamA: team(T.ESP), teamB: team(T.KSA),
    group: "Bảng H", matchDate: new Date("2026-06-21T23:00:00+07:00"),
    venue: "Atlanta Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "G3",
    teamA: team(T.BEL), teamB: team(T.IRN),
    group: "Bảng G", matchDate: new Date("2026-06-22T02:00:00+07:00"),
    venue: "Los Angeles Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // --- June 22 ---
  {
    id: "H4",
    teamA: team(T.URU), teamB: team(T.CPV),
    group: "Bảng H", matchDate: new Date("2026-06-22T05:00:00+07:00"),
    venue: "Miami Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "G4",
    teamA: team(T.NZL), teamB: team(T.EGY),
    group: "Bảng G", matchDate: new Date("2026-06-22T08:00:00+07:00"),
    venue: "Vancouver Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "J3",
    teamA: team(T.ARG), teamB: team(T.AUT),
    group: "Bảng J", matchDate: new Date("2026-06-23T00:00:00+07:00"),
    venue: "Dallas Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "I3",
    teamA: team(T.FRA), teamB: team(T.IRQ),
    group: "Bảng I", matchDate: new Date("2026-06-23T04:00:00+07:00"),
    venue: "Philadelphia Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "I4",
    teamA: team(T.NOR), teamB: team(T.SEN),
    group: "Bảng I", matchDate: new Date("2026-06-23T07:00:00+07:00"),
    venue: "New York New Jersey Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "J4",
    teamA: team(T.JOR), teamB: team(T.ALG),
    group: "Bảng J", matchDate: new Date("2026-06-23T10:00:00+07:00"),
    venue: "San Francisco Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // --- June 23 ---
  {
    id: "K3",
    teamA: team(T.POR), teamB: team(T.UZB),
    group: "Bảng K", matchDate: new Date("2026-06-24T00:00:00+07:00"),
    venue: "Houston Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "L3",
    teamA: team(T.ENG), teamB: team(T.GHA),
    group: "Bảng L", matchDate: new Date("2026-06-24T03:00:00+07:00"),
    venue: "Boston Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "L4",
    teamA: team(T.PAN), teamB: team(T.CRO),
    group: "Bảng L", matchDate: new Date("2026-06-24T06:00:00+07:00"),
    venue: "Toronto Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "K4",
    teamA: team(T.COL), teamB: team(T.COD),
    group: "Bảng K", matchDate: new Date("2026-06-24T09:00:00+07:00"),
    venue: "Guadalajara Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // ========================================
  //  MATCHDAY 3 — June 24–27
  // ========================================

  // --- June 24 ---
  {
    id: "A5",
    teamA: team(T.CZE), teamB: team(T.MEX),
    group: "Bảng A", matchDate: new Date("2026-06-25T08:00:00+07:00"),
    venue: "Mexico City Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "A6",
    teamA: team(T.RSA), teamB: team(T.KOR),
    group: "Bảng A", matchDate: new Date("2026-06-25T08:00:00+07:00"),
    venue: "Monterrey Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "B5",
    teamA: team(T.SUI), teamB: team(T.CAN),
    group: "Bảng B", matchDate: new Date("2026-06-25T02:00:00+07:00"),
    venue: "Vancouver Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "B6",
    teamA: team(T.BIH), teamB: team(T.QAT),
    group: "Bảng B", matchDate: new Date("2026-06-25T02:00:00+07:00"),
    venue: "San Francisco Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "C5",
    teamA: team(T.MAR), teamB: team(T.HAI),
    group: "Bảng C", matchDate: new Date("2026-06-25T05:00:00+07:00"),
    venue: "Atlanta Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "C6",
    teamA: team(T.BRA), teamB: team(T.SCO),
    group: "Bảng C", matchDate: new Date("2026-06-25T05:00:00+07:00"),
    venue: "Miami Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // --- June 25 ---
  {
    id: "D5",
    teamA: team(T.TUR), teamB: team(T.USA),
    group: "Bảng D", matchDate: new Date("2026-06-26T09:00:00+07:00"),
    venue: "Los Angeles Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "D6",
    teamA: team(T.PAR), teamB: team(T.AUS),
    group: "Bảng D", matchDate: new Date("2026-06-26T09:00:00+07:00"),
    venue: "Dallas Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "E5",
    teamA: team(T.CUR), teamB: team(T.CIV),
    group: "Bảng E", matchDate: new Date("2026-06-26T03:00:00+07:00"),
    venue: "Philadelphia Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "E6",
    teamA: team(T.ECU), teamB: team(T.GER),
    group: "Bảng E", matchDate: new Date("2026-06-26T03:00:00+07:00"),
    venue: "Houston Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "F5",
    teamA: team(T.JPN), teamB: team(T.SWE),
    group: "Bảng F", matchDate: new Date("2026-06-26T06:00:00+07:00"),
    venue: "Dallas Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "F6",
    teamA: team(T.TUN), teamB: team(T.NED),
    group: "Bảng F", matchDate: new Date("2026-06-26T06:00:00+07:00"),
    venue: "Monterrey Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // --- June 26 ---
  {
    id: "G5",
    teamA: team(T.EGY), teamB: team(T.IRN),
    group: "Bảng G", matchDate: new Date("2026-06-27T10:00:00+07:00"),
    venue: "Los Angeles Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "G6",
    teamA: team(T.NZL), teamB: team(T.BEL),
    group: "Bảng G", matchDate: new Date("2026-06-27T10:00:00+07:00"),
    venue: "Seattle Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "H5",
    teamA: team(T.CPV), teamB: team(T.KSA),
    group: "Bảng H", matchDate: new Date("2026-06-27T07:00:00+07:00"),
    venue: "Atlanta Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "H6",
    teamA: team(T.URU), teamB: team(T.ESP),
    group: "Bảng H", matchDate: new Date("2026-06-27T07:00:00+07:00"),
    venue: "Miami Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "I5",
    teamA: team(T.SEN), teamB: team(T.IRQ),
    group: "Bảng I", matchDate: new Date("2026-06-27T02:00:00+07:00"),
    venue: "Boston Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "I6",
    teamA: team(T.NOR), teamB: team(T.FRA),
    group: "Bảng I", matchDate: new Date("2026-06-27T02:00:00+07:00"),
    venue: "New York New Jersey Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // --- June 27 ---
  {
    id: "J5",
    teamA: team(T.ALG), teamB: team(T.AUT),
    group: "Bảng J", matchDate: new Date("2026-06-28T09:00:00+07:00"),
    venue: "Kansas City Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "J6",
    teamA: team(T.JOR), teamB: team(T.ARG),
    group: "Bảng J", matchDate: new Date("2026-06-28T09:00:00+07:00"),
    venue: "San Francisco Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "K5",
    teamA: team(T.COD), teamB: team(T.UZB),
    group: "Bảng K", matchDate: new Date("2026-06-28T06:30:00+07:00"),
    venue: "Atlanta Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "K6",
    teamA: team(T.COL), teamB: team(T.POR),
    group: "Bảng K", matchDate: new Date("2026-06-28T06:30:00+07:00"),
    venue: "Miami Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "L5",
    teamA: team(T.CRO), teamB: team(T.GHA),
    group: "Bảng L", matchDate: new Date("2026-06-28T04:00:00+07:00"),
    venue: "Toronto Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "L6",
    teamA: team(T.PAN), teamB: team(T.ENG),
    group: "Bảng L", matchDate: new Date("2026-06-28T04:00:00+07:00"),
    venue: "New York New Jersey Stadium", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // ========================================
  //  ROUND OF 32 — June 29 – July 4
  // ========================================
  {
    id: "R32_1",
    teamA: team(T.RSA), teamB: team(T.CAN),
    group: "Vòng 32 đội", matchDate: new Date("2026-06-29T02:00:00+07:00"),
    venue: "Gillette Stadium (Boston)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_2",
    teamA: team(T.BRA), teamB: team(T.JPN),
    group: "Vòng 32 đội", matchDate: new Date("2026-06-30T00:00:00+07:00"),
    venue: "Toronto Stadium (Toronto)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_3",
    teamA: team(T.GER), teamB: team(T.PAR),
    group: "Vòng 32 đội", matchDate: new Date("2026-06-30T03:30:00+07:00"),
    venue: "SoFi Stadium (Los Angeles)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_4",
    teamA: team(T.NED), teamB: team(T.MAR),
    group: "Vòng 32 đội", matchDate: new Date("2026-06-30T08:00:00+07:00"),
    venue: "Hard Rock Stadium (Miami)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_5",
    teamA: team(T.CIV), teamB: team(T.NOR),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-01T00:00:00+07:00"),
    venue: "MetLife Stadium (New York New Jersey)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_6",
    teamA: team(T.FRA), teamB: team(T.SWE),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-01T04:00:00+07:00"),
    venue: "Mercedes-Benz Stadium (Atlanta)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_7",
    teamA: team(T.MEX), teamB: team(T.ECU),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-01T08:00:00+07:00"),
    venue: "Azteca Stadium (Mexico City)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_8",
    teamA: team(T.ENG), teamB: team(T.COD),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-01T23:00:00+07:00"),
    venue: "Lincoln Financial Field (Philadelphia)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_9",
    teamA: team(T.BEL), teamB: team(T.SEN),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-02T03:00:00+07:00"),
    venue: "Lumen Field (Seattle)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_10",
    teamA: team(T.USA), teamB: team(T.BIH),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-02T07:00:00+07:00"),
    venue: "Levi's Stadium (San Francisco)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_11",
    teamA: team(T.ESP), teamB: team(T.AUT),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-03T02:00:00+07:00"),
    venue: "Arrowhead Stadium (Kansas City)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_12",
    teamA: team(T.POR), teamB: team(T.CRO),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-03T06:00:00+07:00"),
    venue: "AT&T Stadium (Dallas)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_13",
    teamA: team(T.SUI), teamB: team(T.ALG),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-03T10:00:00+07:00"),
    venue: "NRG Stadium (Houston)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_14",
    teamA: team(T.AUS), teamB: team(T.EGY),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-04T01:00:00+07:00"),
    venue: "BC Place (Vancouver)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_15",
    teamA: team(T.ARG), teamB: team(T.CPV),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-04T05:00:00+07:00"),
    venue: "Estadio BBVA (Monterrey)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R32_16",
    teamA: team(T.COL), teamB: team(T.GHA),
    group: "Vòng 32 đội", matchDate: new Date("2026-07-04T08:30:00+07:00"),
    venue: "Estadio Akron (Guadalajara)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // ========================================
  //  ROUND OF 16 — July 5 – July 8
  // ========================================
  {
    id: "R16_1",
    teamA: team(T.CAN), teamB: team(T.MAR),
    group: "Vòng 16 đội", matchDate: new Date("2026-07-05T00:00:00+07:00"),
    venue: "NRG Stadium (Houston)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R16_2",
    teamA: team(T.PAR), teamB: team(T.FRA),
    group: "Vòng 16 đội", matchDate: new Date("2026-07-05T04:00:00+07:00"),
    venue: "Lincoln Financial Field (Philadelphia)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R16_3",
    teamA: team(T.BRA), teamB: team(T.NOR),
    group: "Vòng 16 đội", matchDate: new Date("2026-07-06T03:00:00+07:00"),
    venue: "MetLife Stadium (New York New Jersey)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R16_4",
    teamA: team(T.MEX), teamB: team(T.ENG),
    group: "Vòng 16 đội", matchDate: new Date("2026-07-06T07:00:00+07:00"),
    venue: "Azteca Stadium (Mexico City)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R16_5",
    teamA: team(T.POR), teamB: team(T.ESP),
    group: "Vòng 16 đội", matchDate: new Date("2026-07-07T02:00:00+07:00"),
    venue: "AT&T Stadium (Dallas)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R16_6",
    teamA: team(T.USA), teamB: team(T.BEL),
    group: "Vòng 16 đội", matchDate: new Date("2026-07-07T07:00:00+07:00"),
    venue: "Lumen Field (Seattle)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R16_7",
    teamA: team(T.ARG), teamB: team(T.EGY),
    group: "Vòng 16 đội", matchDate: new Date("2026-07-07T23:00:00+07:00"),
    venue: "Mercedes-Benz Stadium (Atlanta)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "R16_8",
    teamA: team(T.SUI), teamB: team(T.COL),
    group: "Vòng 16 đội", matchDate: new Date("2026-07-08T03:00:00+07:00"),
    venue: "BC Place (Vancouver)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },

  // ========================================
  //  QUARTER-FINALS (VÒNG 8 ĐỘI / TỨ KẾT) — July 9 – July 11
  // ========================================
  {
    id: "QF_1",
    teamA: team(T.FRA), teamB: team(T.MAR),
    group: "Tứ kết", matchDate: new Date("2026-07-10T03:00:00+07:00"),
    venue: "Gillette Stadium (Boston)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "QF_2",
    teamA: team(T.ESP), teamB: team(T.BEL),
    group: "Tứ kết", matchDate: new Date("2026-07-11T02:00:00+07:00"),
    venue: "SoFi Stadium (Los Angeles)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "QF_3",
    teamA: team(T.NOR), teamB: team(T.ENG),
    group: "Tứ kết", matchDate: new Date("2026-07-12T04:00:00+07:00"),
    venue: "Hard Rock Stadium (Miami)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
  {
    id: "QF_4",
    teamA: team(T.ARG), teamB: team(T.SUI),
    group: "Tứ kết", matchDate: new Date("2026-07-12T08:00:00+07:00"),
    venue: "Kansas City Stadium (Kansas City)", status: "upcoming",
    result: null, scoreA: null, scoreB: null,
    votes: emptyVotes(),
  },
];
