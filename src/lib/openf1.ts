import { z } from "zod";
import { getOrFetch } from "./cache";
import { fetchWithRetry } from "./http";
import type { Session, Lap, Driver, DriverPerformance, Meeting } from "./types";

const BASE_URL = "https://api.openf1.org/v1";
const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

export class OpenF1LiveSessionError extends Error {
  constructor() {
    super("Live session in progress — data unavailable during session");
    this.name = "OpenF1LiveSessionError";
  }
}

const MeetingSchema = z
  .object({
    meeting_key: z.number(),
    meeting_name: z.string(),
    meeting_official_name: z.string(),
    date_start: z.string(),
    year: z.number(),
    country_name: z.string(),
    circuit_short_name: z.string(),
  })
  .passthrough();

const SessionSchema = z
  .object({
    session_key: z.number(),
    session_name: z.string(),
    session_type: z.string(),
    date_start: z.string(),
    date_end: z.string(),
    meeting_key: z.number(),
    year: z.number(),
    country_name: z.string(),
    circuit_short_name: z.string(),
  })
  .passthrough();

const LapSchema = z
  .object({
    session_key: z.number(),
    driver_number: z.number(),
    lap_number: z.number(),
    lap_duration: z.number().nullable(),
    duration_sector_1: z.number().nullable(),
    duration_sector_2: z.number().nullable(),
    duration_sector_3: z.number().nullable(),
    i1_speed: z.number().nullable(),
    i2_speed: z.number().nullable(),
    st_speed: z.number().nullable(),
    is_pit_out_lap: z.boolean(),
    date_start: z.string(),
  })
  .passthrough();

const DriverSchema = z
  .object({
    driver_number: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    full_name: z.string(),
    name_acronym: z.string(),
    team_name: z.string(),
    team_colour: z.string(),
    country_code: z.string(),
    headshot_url: z.string().nullable(),
    session_key: z.number(),
  })
  .passthrough();

async function fetchJson<T>(
  path: string,
  params: Record<string, string>,
  schema: z.ZodType<T>,
): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetchWithRetry(url.toString());
  // OpenF1's free tier returns 401 specifically while a session is live, not as a
  // generic auth error — surface it as the live-session signal so the UI can react.
  if (response.status === 401) {
    throw new OpenF1LiveSessionError();
  }
  if (!response.ok) {
    throw new Error(`OpenF1 API error: ${response.status} ${response.statusText} for ${path}`);
  }

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(`OpenF1 ${path} shape changed: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }
  return parsed.data;
}

export async function getLatestMeeting(): Promise<Meeting | null> {
  const meetings = await getOrFetch(
    "meetings:latest",
    () => fetchJson("/meetings", { year: String(new Date().getFullYear()) }, z.array(MeetingSchema)),
    CACHE_TTL_MS,
  );

  if (meetings.length === 0) return null;

  const now = new Date();
  const pastOrCurrent = meetings.filter((m) => new Date(m.date_start) <= now);

  // Only return a meeting that has started — a future-only meeting has no practice
  // data yet, so null (→ 404) is clearer than an empty table.
  return pastOrCurrent.length > 0 ? pastOrCurrent[pastOrCurrent.length - 1]! : null;
}

export async function getPracticeSessions(meetingKey: number): Promise<Session[]> {
  return getOrFetch(
    `sessions:${meetingKey}`,
    async () => {
      const sessions = await fetchJson(
        "/sessions",
        { meeting_key: String(meetingKey) },
        z.array(SessionSchema),
      );
      return sessions.filter((s) =>
        ["Practice 1", "Practice 2", "Practice 3"].includes(s.session_name),
      );
    },
    CACHE_TTL_MS,
  );
}

export async function getSessionLaps(sessionKey: number): Promise<Lap[]> {
  return getOrFetch(
    `laps:${sessionKey}`,
    () => fetchJson("/laps", { session_key: String(sessionKey) }, z.array(LapSchema)),
    CACHE_TTL_MS,
  );
}

export async function getSessionDrivers(sessionKey: number): Promise<Driver[]> {
  return getOrFetch(
    `drivers:${sessionKey}`,
    () => fetchJson("/drivers", { session_key: String(sessionKey) }, z.array(DriverSchema)),
    CACHE_TTL_MS,
  );
}

export function findBestLap(laps: Lap[]): Lap | null {
  const validLaps = laps.filter(
    (l): l is Lap & { lap_duration: number } => l.lap_duration !== null && !l.is_pit_out_lap,
  );
  if (validLaps.length === 0) return null;

  return validLaps.reduce((best, lap) => (lap.lap_duration < best.lap_duration ? lap : best));
}

export function findBestSectors(laps: Lap[]): DriverPerformance["bestSectors"] {
  // Unlike findBestLap, this does not require a non-null overall lap_duration: a lap can
  // have valid sector times even when the overall time is missing (e.g. a deleted lap).
  const validLaps = laps.filter((l) => !l.is_pit_out_lap);

  const sector1 = validLaps
    .map((l) => l.duration_sector_1)
    .filter((v): v is number => v !== null);
  const sector2 = validLaps
    .map((l) => l.duration_sector_2)
    .filter((v): v is number => v !== null);
  const sector3 = validLaps
    .map((l) => l.duration_sector_3)
    .filter((v): v is number => v !== null);

  return {
    sector1: sector1.length > 0 ? Math.min(...sector1) : null,
    sector2: sector2.length > 0 ? Math.min(...sector2) : null,
    sector3: sector3.length > 0 ? Math.min(...sector3) : null,
  };
}

export function findTopSpeed(laps: Lap[]): number | null {
  const speeds = laps
    .flatMap((l) => [l.i1_speed, l.i2_speed, l.st_speed])
    .filter((v): v is number => v !== null);

  return speeds.length > 0 ? Math.max(...speeds) : null;
}

export async function getDriverPerformances(sessionKey: number): Promise<DriverPerformance[]> {
  const [laps, drivers, session] = await Promise.all([
    getSessionLaps(sessionKey),
    getSessionDrivers(sessionKey),
    getOrFetch(
      `session-info:${sessionKey}`,
      () => fetchJson("/sessions", { session_key: String(sessionKey) }, z.array(SessionSchema)),
      CACHE_TTL_MS,
    ),
  ]);
  const sessionName = session[0]?.session_name ?? "Unknown";

  const lapsByDriver = new Map<number, Lap[]>();
  for (const lap of laps) {
    const existing = lapsByDriver.get(lap.driver_number) ?? [];
    existing.push(lap);
    lapsByDriver.set(lap.driver_number, existing);
  }

  return drivers.map((driver) => {
    const driverLaps = lapsByDriver.get(driver.driver_number) ?? [];
    return {
      driver,
      bestLap: findBestLap(driverLaps),
      bestSectors: findBestSectors(driverLaps),
      topSpeed: findTopSpeed(driverLaps),
      lapCount: driverLaps.filter((l) => !l.is_pit_out_lap).length,
      sessionName,
    };
  });
}
