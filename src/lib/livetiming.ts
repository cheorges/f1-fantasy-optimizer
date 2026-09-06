import { getCached, setCache } from "./cache";
import type { LiveSession, LiveDriver } from "./types";

// F1's own live timing feed, the one formula1.com/en/timing/f1-live-lite reads. No key and no
// account, but it refuses any request carrying a foreign Origin, so it must run server-side.
const NEGOTIATE_URL = "https://livetiming.formula1.com/signalrcore/negotiate?negotiateVersion=1";
const SOCKET_URL = "wss://livetiming.formula1.com/signalrcore";
const RECORD_SEPARATOR = "\x1e";

// Subscribing returns the complete current state in one reply, so nothing here merges deltas.
const TOPICS = [
  "TimingData",
  "DriverList",
  "SessionInfo",
  "SessionStatus",
  "ExtrapolatedClock",
  "TrackStatus",
];

const CACHE_KEY = "livetiming:snapshot";

// One upstream connection per window, however many clients poll: the cache covers the window,
// `inFlight` covers the fetch itself.
export const SNAPSHOT_TTL_MS = 5_000;

// One attempt, and the whole call including the retry.
const ATTEMPT_TIMEOUT_MS = 6_000;
const TOTAL_TIMEOUT_MS = 12_000;

const RUNNING_STATES = new Set(["Started", "Aborted"]);

// "1:22.687" to 82.687. Null for the empty string the feed sends before a driver has a lap.
export function parseLapTime(value: string | null): number | null {
  if (!value) return null;
  const parts = value.split(":");
  const seconds = Number(parts.pop());
  if (Number.isNaN(seconds)) return null;
  const minutes = parts.length ? Number(parts.pop()) : 0;
  if (Number.isNaN(minutes)) return null;
  return minutes * 60 + seconds;
}

export class LiveTimingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LiveTimingError";
  }
}

interface Negotiated {
  token: string;
  cookies: string;
}

// The load balancer pins the token to the instance that issued it. Without the AWSALB cookies
// the socket lands elsewhere and is refused with a 404, intermittently.
async function negotiate(budgetMs: number): Promise<Negotiated> {
  const response = await fetch(NEGOTIATE_URL, {
    method: "POST",
    signal: AbortSignal.timeout(budgetMs),
  });
  if (!response.ok) {
    throw new LiveTimingError(`Negotiate failed with ${response.status}`);
  }

  const body = (await response.json()) as { connectionToken?: unknown };
  if (typeof body.connectionToken !== "string") {
    throw new LiveTimingError("Negotiate response carried no connection token");
  }

  const cookies = response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");

  return { token: body.connectionToken, cookies };
}

// Node's global WebSocket takes an options object the DOM typings don't describe.
type SocketOptions = { headers: Record<string, string> };

function openSocket({ token, cookies }: Negotiated): WebSocket {
  const options: SocketOptions = { headers: {} };
  if (cookies) options.headers.Cookie = cookies;
  return new WebSocket(`${SOCKET_URL}?id=${token}`, options as unknown as string[]);
}

// Capped at one attempt's worth and never zero: AbortSignal.timeout(0) rejects immediately.
function remainingBudget(deadline: number): number {
  return Math.max(1, Math.min(ATTEMPT_TIMEOUT_MS, deadline - Date.now()));
}

async function fetchRawSnapshot(deadline: number): Promise<Record<string, unknown>> {
  const negotiated = await negotiate(remainingBudget(deadline));

  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const socket = openSocket(negotiated);
    let settled = false;
    let handshakeDone = false;

    const finish = (result: Record<string, unknown> | Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch {
        // Closing a socket that never opened is not worth reporting.
      }
      if (result instanceof Error) reject(result);
      else resolve(result);
    };

    const timer = setTimeout(
      () => finish(new LiveTimingError("Live timing did not answer in time")),
      remainingBudget(deadline),
    );

    socket.onopen = () => {
      socket.send(JSON.stringify({ protocol: "json", version: 1 }) + RECORD_SEPARATOR);
    };

    socket.onerror = () => finish(new LiveTimingError("Live timing connection failed"));

    socket.onclose = () => finish(new LiveTimingError("Live timing closed the connection"));

    socket.onmessage = (event) => {
      // The handshake reply is an empty object; the subscription goes out once it lands.
      if (!handshakeDone) {
        handshakeDone = true;
        socket.send(
          JSON.stringify({
            type: 1,
            invocationId: "1",
            target: "Subscribe",
            arguments: [TOPICS],
          }) + RECORD_SEPARATOR,
        );
        return;
      }

      for (const record of String(event.data).split(RECORD_SEPARATOR)) {
        if (!record.trim()) continue;
        let message: unknown;
        try {
          message = JSON.parse(record);
        } catch {
          continue;
        }
        // Type 3 completes the Subscribe call and carries the full state.
        const parsed = message as { type?: number; result?: unknown };
        if (parsed.type === 3 && isRecord(parsed.result)) {
          finish(parsed.result);
          return;
        }
      }
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = source[key];
  return isRecord(value) ? value : {};
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === "string" ? value : "";
}

function readNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

// Read field by field instead of validating with zod like the OpenF1 and Fantasy clients do.
// Those feed the swap engine, where a changed shape would corrupt a recommendation. This one
// fills a table: a renamed field should cost its column, not the page.
export function parseSnapshot(raw: Record<string, unknown>): LiveSession {
  const sessionInfo = readRecord(raw, "SessionInfo");
  const sessionStatus = readRecord(raw, "SessionStatus");
  const clock = readRecord(raw, "ExtrapolatedClock");
  const trackStatus = readRecord(raw, "TrackStatus");
  const driverList = readRecord(raw, "DriverList");
  const lines = readRecord(readRecord(raw, "TimingData"), "Lines");

  const drivers: LiveDriver[] = [];
  for (const [driverNumber, value] of Object.entries(lines)) {
    if (!isRecord(value)) continue;
    const entry = readRecord(driverList, driverNumber);
    const position = readNumber(value, "Position");

    drivers.push({
      // An empty position means no time yet. Sorting those last keeps them on screen.
      position: position > 0 ? position : Number.MAX_SAFE_INTEGER,
      driverNumber,
      acronym: readString(entry, "Tla") || driverNumber,
      fullName: readString(entry, "FullName"),
      teamName: readString(entry, "TeamName"),
      teamColour: readString(entry, "TeamColour"),
      bestLapTime: readString(readRecord(value, "BestLapTime"), "Value") || null,
      gapToLeader: readString(value, "TimeDiffToFastest") || null,
      laps: readNumber(value, "NumberOfLaps"),
      inPit: value.InPit === true,
    });
  }
  drivers.sort((a, b) => a.position - b.position);

  // Not the leader's lap: in a race `Position` is race position, and the leader's personal
  // best is usually not the quickest lap of the session.
  let fastest: LiveDriver | null = null;
  let fastestSeconds = Infinity;
  for (const driver of drivers) {
    const seconds = parseLapTime(driver.bestLapTime);
    if (seconds !== null && seconds < fastestSeconds) {
      fastestSeconds = seconds;
      fastest = driver;
    }
  }

  const status = readString(sessionStatus, "Status");

  return {
    live: RUNNING_STATES.has(status),
    status,
    sessionName: readString(sessionInfo, "Name"),
    meetingName: readString(readRecord(sessionInfo, "Meeting"), "Name"),
    trackStatus: readString(trackStatus, "Message"),
    remaining: readString(clock, "Remaining") || null,
    fastestLap: fastest?.bestLapTime ?? null,
    fastestDriverNumber: fastest?.driverNumber ?? null,
    fetchedAt: Date.now(),
    drivers,
  };
}

let inFlight: Promise<LiveSession> | null = null;

async function fetchWithRetry(): Promise<LiveSession> {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;

  // The socket is refused with a 404 now and then even with the cookies forwarded.
  try {
    return parseSnapshot(await fetchRawSnapshot(deadline));
  } catch (error) {
    if (Date.now() >= deadline) throw error;
    return parseSnapshot(await fetchRawSnapshot(deadline));
  }
}

export async function getLiveSession(): Promise<LiveSession> {
  const cached = getCached<LiveSession>(CACHE_KEY);
  if (cached !== null) return cached;

  // The cache is written only once the fetch resolves, so without this every request landing
  // inside that window would open its own socket. A failure clears the slot too.
  inFlight ??= fetchWithRetry()
    .then((session) => {
      setCache(CACHE_KEY, session, SNAPSHOT_TTL_MS);
      return session;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
