// What the UI holds while an endpoint is blocked. savedAt is when the data currently on
// screen was fetched; null means nothing was ever cached on this device.
export interface StaleState {
  message: string;
  savedAt: number | null;
}

// How often to retry while blocked. A session lasts an hour, so probing more eagerly would
// just be noise.
export const RETRY_INTERVAL_MS = 5 * 60 * 1000;

// Returns the live-session message if a response is the OpenF1 503/LIVE_SESSION signal,
// otherwise null. Lets the UI show a toast without coupling fetch code to toast state.
export async function getLiveSessionMessage(res: Response): Promise<string | null> {
  if (res.ok || res.status !== 503) return null;
  const body = await res.clone().json().catch(() => null);
  if (body && typeof body === "object" && "code" in body && body.code === "LIVE_SESSION") {
    return typeof body.error === "string" ? body.error : "Live session in progress";
  }
  return null;
}
