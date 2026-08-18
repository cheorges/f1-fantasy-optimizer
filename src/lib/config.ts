// Set USE_MOCK_DATA=true to serve fake data without hitting external APIs (UI dev).
export const USE_MOCK_DATA = process.env.USE_MOCK_DATA === "true";

// Swap budget range on the home page, where the user is exploring "what does N buy me".
// Starts at 0, which is a real question rather than an empty one: the engine keeps swaps
// with `priceDelta <= budget`, so 0 asks "who is quicker without costing more". Never
// negative — that has no answer to give.
export const BUDGET_MIN = 0;
export const BUDGET_MAX = 25;
export const BUDGET_STEP = 0.1;

// Available budget on the teams page — the free budget the official Fantasy app shows,
// copied across by hand. Never negative: free budget is what is left, and 0 is a real
// state (a squad spent right up to the cap), so the range starts there rather than at a
// step above it.
export const AVAILABLE_MIN = 0;
export const AVAILABLE_MAX = 25;
