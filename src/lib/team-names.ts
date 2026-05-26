// Reconciles OpenF1 `team_name` with F1 Fantasy constructor names, which carry
// sponsor prefixes (e.g. "Stake F1 Team Kick Sauber"). Each known variant maps to a
// single canonical key so matching stays EXACT on that key — never substring matching,
// which would falsely equate distinct teams (e.g. "Red Bull" vs "Racing Bulls").
const TEAM_ALIASES: Record<string, string> = {
  "RED BULL RACING": "RED_BULL",
  "RED BULL": "RED_BULL",
  "ORACLE RED BULL RACING": "RED_BULL",
  "MCLAREN": "MCLAREN",
  "MCLAREN FORMULA 1 TEAM": "MCLAREN",
  "FERRARI": "FERRARI",
  "SCUDERIA FERRARI": "FERRARI",
  "MERCEDES": "MERCEDES",
  "MERCEDES-AMG PETRONAS F1 TEAM": "MERCEDES",
  "ASTON MARTIN": "ASTON_MARTIN",
  "ASTON MARTIN ARAMCO": "ASTON_MARTIN",
  "ASTON MARTIN ARAMCO F1 TEAM": "ASTON_MARTIN",
  "ALPINE": "ALPINE",
  "BWT ALPINE F1 TEAM": "ALPINE",
  "RB": "RACING_BULLS",
  "RACING BULLS": "RACING_BULLS",
  "VISA CASH APP RB": "RACING_BULLS",
  "VISA CASH APP RB F1 TEAM": "RACING_BULLS",
  "WILLIAMS": "WILLIAMS",
  "WILLIAMS RACING": "WILLIAMS",
  "HAAS": "HAAS",
  "HAAS F1 TEAM": "HAAS",
  "MONEYGRAM HAAS F1 TEAM": "HAAS",
  "KICK SAUBER": "KICK_SAUBER",
  "SAUBER": "KICK_SAUBER",
  "STAKE F1 TEAM KICK SAUBER": "KICK_SAUBER",
};

export function canonicalTeam(name: string): string {
  const upper = name.trim().toUpperCase();
  return TEAM_ALIASES[upper] ?? upper;
}
