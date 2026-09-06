// What the UI holds while an endpoint is blocked. savedAt is when the data currently on
// screen was fetched; null means nothing was ever cached on this device. The server's own
// message is deliberately not kept — the banner's wording says more than the API string,
// and holding an upstream-controlled string that nothing renders only invites someone to
// render it later.
export interface StaleState {
  savedAt: number | null;
}

// How often to retry while blocked. A session lasts an hour, so probing more eagerly would
// just be noise.
export const RETRY_INTERVAL_MS = 5 * 60 * 1000;

// Returns the live-session message if a response is the OpenF1 503/LIVE_SESSION signal,
// otherwise null. Callers use it to tell "blocked" apart from a genuine failure.
export async function getLiveSessionMessage(res: Response): Promise<string | null> {
  if (res.ok || res.status !== 503) return null;
  const body = await res.clone().json().catch(() => null);
  if (body && typeof body === "object" && "code" in body && body.code === "LIVE_SESSION") {
    return typeof body.error === "string" ? body.error : "Live session in progress";
  }
  return null;
}

// `Inactive` is deliberately absent: a session that has not started still has everything
// ahead of it. Lives here so the live page can import it without pulling in the WebSocket
// client.
const FINISHED_STATES = new Set(["Finished", "Finalised", "Ends"]);

export function isSessionOver(status: string): boolean {
  return FINISHED_STATES.has(status);
}
