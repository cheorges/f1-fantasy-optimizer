// Retries on 5xx with exponential backoff. 4xx and network-level successes return
// immediately; the final attempt's response is returned so callers can inspect status.
export async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url);
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
