const REQUEST_TIMEOUT_MS = 10_000;

// Retries on 5xx with exponential backoff. 4xx and network-level successes return
// immediately; the final attempt's response is returned so callers can inspect status.
// Each attempt is bounded by a timeout so a hung upstream can't block the request
// (a timeout aborts, surfaces as an error, and is retried like any network failure).
export async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (response.ok || response.status < 500) return response;
      if (attempt === retries - 1) return response;
    } catch (error) {
      lastError = error;
      if (attempt === retries - 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }

  throw lastError ?? new Error(`Request failed after ${retries} attempts: ${url}`);
}
