import { getOrFetch } from "./cache";
import type { Session, Lap, Driver, DriverPerformance, Meeting } from "./types";

const BASE_URL = "https://api.openf1.org/v1";
const CACHE_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

async function fetchJson<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`OpenF1 API error: ${response.status} ${response.statusText} for ${path}`);
  }

  return response.json() as Promise<T>;
}

export async function getLatestMeeting(): Promise<Meeting | null> {
  const meetings = await getOrFetch(
    "meetings:latest",
    () => fetchJson<Meeting[]>("/meetings", { year: "2026" }),
    CACHE_TTL_MS,
  );

  if (meetings.length === 0) return null;

  const now = new Date();
  const pastOrCurrent = meetings.filter((m) => new Date(m.date_start) <= now);

  return pastOrCurrent.length > 0 ? pastOrCurrent[pastOrCurrent.length - 1]! : meetings[0]!;
}

export async function getPracticeSessions(meetingKey: number): Promise<Session[]> {
  return getOrFetch(
    `sessions:${meetingKey}`,
    async () => {
      const sessions = await fetchJson<Session[]>("/sessions", {
        meeting_key: String(meetingKey),
      });
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
    () => fetchJson<Lap[]>("/laps", { session_key: String(sessionKey) }),
    CACHE_TTL_MS,
  );
}

export async function getSessionDrivers(sessionKey: number): Promise<Driver[]> {
  return getOrFetch(
    `drivers:${sessionKey}`,
    () => fetchJson<Driver[]>("/drivers", { session_key: String(sessionKey) }),
    CACHE_TTL_MS,
  );
}

function findBestLap(laps: Lap[]): Lap | null {
  const validLaps = laps.filter((l) => l.lap_duration !== null && !l.is_pit_out_lap);
  if (validLaps.length === 0) return null;

  return validLaps.reduce((best, lap) =>
    lap.lap_duration! < best.lap_duration! ? lap : best,
  );
}

function findBestSectors(laps: Lap[]): DriverPerformance["bestSectors"] {
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

function findTopSpeed(laps: Lap[]): number | null {
  const speeds = laps
    .flatMap((l) => [l.i1_speed, l.i2_speed, l.st_speed])
    .filter((v): v is number => v !== null);

  return speeds.length > 0 ? Math.max(...speeds) : null;
}

export async function getDriverPerformances(sessionKey: number): Promise<DriverPerformance[]> {
  const [laps, drivers] = await Promise.all([
    getSessionLaps(sessionKey),
    getSessionDrivers(sessionKey),
  ]);

  const session = await getOrFetch(
    `session-info:${sessionKey}`,
    () => fetchJson<Session[]>("/sessions", { session_key: String(sessionKey) }),
    CACHE_TTL_MS,
  );
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
