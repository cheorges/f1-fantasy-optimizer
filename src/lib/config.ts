// Set USE_MOCK_DATA=true to serve fake data without hitting external APIs (UI dev).
export const USE_MOCK_DATA = process.env.USE_MOCK_DATA === "true";

// Swap budget range, shared by the slider UI and the default for a new team.
export const BUDGET_MIN = 0.1;
export const BUDGET_MAX = 10;
export const BUDGET_STEP = 0.1;
