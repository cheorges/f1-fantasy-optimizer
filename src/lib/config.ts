// Set USE_MOCK_DATA=true to serve fake data without hitting external APIs (UI dev).
export const USE_MOCK_DATA = process.env.USE_MOCK_DATA === "true";

// Swap budget range on the home page, where the user is exploring "what does N buy me".
// Never negative: on the home page the question is "what does N buy me", and a negative
// budget has no answer to give.
export const BUDGET_MIN = 0.1;
export const BUDGET_MAX = 15;
export const BUDGET_STEP = 0.1;

// Budget correction range on the teams page. Negative is meaningful too: a squad whose
// prices fell is worth less today than what was paid for it.
export const CORRECTION_MIN = -15;
export const CORRECTION_MAX = 15;
