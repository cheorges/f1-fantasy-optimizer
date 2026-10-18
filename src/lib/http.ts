const REQUEST_TIMEOUT_MS = 10_000;
// OpenF1's free tier allows 3 requests per second and answers a burst with
// `retry-after: 1`. A longer wait means the per-minute limit, and holding the request
// that long is worse than failing it.
const MAX_RETRY_AFTER_MS = 5_000;

function retryAfterMs(response: Response): number | null {
  const seconds = Number(response.headers.get("retry-after") ?? NaN);
  return Number.isFinite(seconds) ? seconds * 1000 : null;
}

// Retries on 5xx and 429 with exponential backoff, or after Retry-After when a 429 sends
// one. Other 4xx and successes return immediately; the final attempt's response is
// returned so callers can inspect status.
// Each attempt is bounded by a timeout so a hung upstream can't block the request
// (a timeout aborts, surfaces as an error, and is retried like any network failure).
export async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    let delayMs = 1000 * 2 ** attempt;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (response.status === 429) {
        const waitMs = retryAfterMs(response);
        if (waitMs !== null && waitMs > MAX_RETRY_AFTER_MS) return response;
        if (waitMs !== null) delayMs = waitMs;
      } else if (response.status < 500) {
        return response;
      }
      if (attempt === retries - 1) return response;
    } catch (error) {
      lastError = error;
      if (attempt === retries - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw lastError ?? new Error(`Request failed after ${retries} attempts: ${url}`);
}
