import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { findBestLap, findBestSectors, findTopSpeed, getCompletedPracticeSessions, getDriverPerformances, getSessionDrivers, getSessionLaps, OpenF1LiveSessionError } from "./openf1";
import { clearCache } from "./cache";
import type { Lap, Session } from "./types";

function lap(overrides: Partial<Lap>): Lap {
  return {
    session_key: 1,
    driver_number: 1,
    lap_number: 1,
    lap_duration: 90,
    duration_sector_1: 30,
    duration_sector_2: 30,
    duration_sector_3: 30,
    i1_speed: 300,
    i2_speed: 300,
    st_speed: 300,
    is_pit_out_lap: false,
    date_start: "2026-01-01T00:00:00",
    ...overrides,
  };
}

describe("findBestLap", () => {
  it("returns the fastest non-pit-out lap with a valid duration", () => {
    const laps = [
      lap({ lap_number: 1, lap_duration: 91 }),
      lap({ lap_number: 2, lap_duration: 89 }),
      lap({ lap_number: 3, lap_duration: 90 }),
    ];
    expect(findBestLap(laps)?.lap_number).toBe(2);
  });

  it("ignores pit-out laps and null durations", () => {
    const laps = [
      lap({ lap_number: 1, lap_duration: 80, is_pit_out_lap: true }),
      lap({ lap_number: 2, lap_duration: null }),
      lap({ lap_number: 3, lap_duration: 90 }),
    ];
    expect(findBestLap(laps)?.lap_number).toBe(3);
  });

  it("returns null when no lap is valid", () => {
    expect(findBestLap([lap({ lap_duration: null })])).toBeNull();
    expect(findBestLap([])).toBeNull();
  });
});

describe("findBestSectors", () => {
  it("returns the minimum per sector, including laps with a null overall duration", () => {
    const laps = [
      lap({ lap_duration: null, duration_sector_1: 28, duration_sector_2: 33, duration_sector_3: 29 }),
      lap({ lap_duration: 90, duration_sector_1: 29, duration_sector_2: 32, duration_sector_3: 30 }),
    ];
    expect(findBestSectors(laps)).toEqual({ sector1: 28, sector2: 32, sector3: 29 });
  });

  it("returns null for a sector with no valid times", () => {
    const laps = [lap({ duration_sector_1: null, duration_sector_2: null, duration_sector_3: null })];
    expect(findBestSectors(laps)).toEqual({ sector1: null, sector2: null, sector3: null });
  });
});

describe("findTopSpeed", () => {
  it("returns the maximum speed across all speed traps", () => {
    const laps = [
      lap({ i1_speed: 310, i2_speed: 320, st_speed: 315 }),
      lap({ i1_speed: 305, i2_speed: 300, st_speed: 330 }),
    ];
    expect(findTopSpeed(laps)).toBe(330);
  });

  it("returns null when all speeds are null", () => {
    expect(findTopSpeed([lap({ i1_speed: null, i2_speed: null, st_speed: null })])).toBeNull();
  });
});

// Regression: OpenF1 sends null in fields it otherwise types as strings. Because the
// schemas fail loudly, a single null used to take down the whole session fetch.
describe("feed tolerance for nulls", () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts a null country_code on drivers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{
      driver_number: 4,
      first_name: "Lando",
      last_name: "Norris",
      full_name: "Lando NORRIS",
      name_acronym: "NOR",
      team_name: "McLaren",
      team_colour: "F47600",
      country_code: null,
      headshot_url: null,
      session_key: 11337,
    }]), { status: 200 })));

    const drivers = await getSessionDrivers(11337);
    expect(drivers).toHaveLength(1);
    expect(drivers[0]!.country_code).toBeNull();
  });

  it("accepts a null date_start on a lap", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{
      session_key: 11337,
      driver_number: 4,
      lap_number: 1,
      lap_duration: 78.5,
      duration_sector_1: 26,
      duration_sector_2: 26,
      duration_sector_3: 26.5,
      i1_speed: 300,
      i2_speed: 300,
      st_speed: 300,
      is_pit_out_lap: false,
      date_start: null,
    }]), { status: 200 })));

    const laps = await getSessionLaps(11337);
    expect(laps).toHaveLength(1);
    expect(laps[0]!.date_start).toBeNull();
  });
});

// A live session blocks every endpoint for its whole duration. Without remembering the
// 401, each client's retry costs three upstream calls that can only fail.
describe("live-session back-off", () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stops calling upstream once a 401 has been seen", async () => {
    const fetchSpy = vi.fn(async () => new Response("", { status: 401 }));
    vi.stubGlobal("fetch", fetchSpy);

    await expect(getSessionLaps(1)).rejects.toBeInstanceOf(OpenF1LiveSessionError);
    await expect(getSessionDrivers(1)).rejects.toBeInstanceOf(OpenF1LiveSessionError);
    await expect(getSessionLaps(2)).rejects.toBeInstanceOf(OpenF1LiveSessionError);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("goes back upstream once the back-off has expired", async () => {
    vi.useFakeTimers();
    const fetchSpy = vi.fn(async () => new Response("", { status: 401 }));
    vi.stubGlobal("fetch", fetchSpy);

    await expect(getSessionLaps(1)).rejects.toBeInstanceOf(OpenF1LiveSessionError);
    vi.advanceTimersByTime(61_000);
    await expect(getSessionLaps(1)).rejects.toBeInstanceOf(OpenF1LiveSessionError);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

function session(session_key: number, session_name: string, date_start: string, date_end: string): Session {
  return {
    session_key, session_name, date_start, date_end,
    session_type: "X", meeting_key: 1, year: 2026, country_name: "X", circuit_short_name: "X",
  };
}

// Shapes as OpenF1 sends them: the whole weekend is listed in advance, future sessions included.
const SINGAPORE_SPRINT: Session[] = [
  session(11378, "Practice 1", "2026-10-09T08:30:00+00:00", "2026-10-09T09:30:00+00:00"),
  session(11379, "Sprint Qualifying", "2026-10-09T12:30:00+00:00", "2026-10-09T13:14:00+00:00"),
  session(11383, "Sprint", "2026-10-10T09:00:00+00:00", "2026-10-10T09:30:00+00:00"),
  session(11384, "Qualifying", "2026-10-10T13:00:00+00:00", "2026-10-10T14:00:00+00:00"),
  session(11388, "Race", "2026-10-11T12:00:00+00:00", "2026-10-11T14:00:00+00:00"),
];
const AUSTIN: Session[] = [
  session(11389, "Practice 1", "2026-10-23T17:30:00+00:00", "2026-10-23T18:30:00+00:00"),
  session(11390, "Practice 2", "2026-10-23T21:00:00+00:00", "2026-10-23T22:00:00+00:00"),
  session(11391, "Practice 3", "2026-10-24T17:30:00+00:00", "2026-10-24T18:30:00+00:00"),
  session(11392, "Qualifying", "2026-10-24T21:00:00+00:00", "2026-10-24T22:00:00+00:00"),
  session(11396, "Race", "2026-10-25T20:00:00+00:00", "2026-10-25T22:00:00+00:00"),
];

describe("getCompletedPracticeSessions", () => {
  beforeEach(() => {
    clearCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function serve(sessions: Session[]) {
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify(sessions), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    return fetchSpy;
  }

  it("returns the single practice of a sprint weekend, even after the sprint has run", async () => {
    vi.setSystemTime(new Date("2026-10-11T15:00:00Z"));
    serve(SINGAPORE_SPRINT);

    const sessions = await getCompletedPracticeSessions(1);
    expect(sessions.map((s) => s.session_name)).toEqual(["Practice 1"]);
  });

  it("leaves out practices that have not been run yet", async () => {
    vi.setSystemTime(new Date("2026-10-23T19:00:00Z"));
    serve(AUSTIN);

    const sessions = await getCompletedPracticeSessions(1);
    expect(sessions.map((s) => s.session_name)).toEqual(["Practice 1"]);
  });

  it("leaves out a practice that is still running", async () => {
    vi.setSystemTime(new Date("2026-10-23T21:30:00Z"));
    serve(AUSTIN);

    const sessions = await getCompletedPracticeSessions(1);
    expect(sessions.map((s) => s.session_name)).toEqual(["Practice 1"]);
  });

  it("orders by start time, so the last entry is the latest practice", async () => {
    vi.setSystemTime(new Date("2026-10-25T00:00:00Z"));
    serve([AUSTIN[2]!, AUSTIN[0]!, AUSTIN[1]!]);

    const sessions = await getCompletedPracticeSessions(1);
    expect(sessions.map((s) => s.session_name)).toEqual(["Practice 1", "Practice 2", "Practice 3"]);
  });

  it("picks up a practice once it has ended, without waiting for the cache to expire", async () => {
    vi.setSystemTime(new Date("2026-10-23T19:00:00Z"));
    const fetchSpy = serve(AUSTIN);

    expect((await getCompletedPracticeSessions(1)).map((s) => s.session_name)).toEqual(["Practice 1"]);
    vi.setSystemTime(new Date("2026-10-23T22:05:00Z"));
    expect((await getCompletedPracticeSessions(1)).map((s) => s.session_name)).toEqual(["Practice 1", "Practice 2"]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

// OpenF1 lists laps deleted for track limits with their time and no flag. The official
// classification leaves them out, and only /session_result carries it.
describe("getDriverPerformances", () => {
  const VER = {
    driver_number: 3, first_name: "Max", last_name: "Verstappen", full_name: "Max VERSTAPPEN",
    name_acronym: "VER", team_name: "Red Bull Racing", team_colour: "4781D7",
    country_code: "NED", headshot_url: null, session_key: 11389,
  };
  // Austin FP1: 1:35.860 was deleted at turn 19, 1:36.136 is the classified time (P2).
  const LAPS = [
    lap({ session_key: 11389, driver_number: 3, lap_number: 9, lap_duration: 96.136 }),
    lap({ session_key: 11389, driver_number: 3, lap_number: 15, lap_duration: 95.86 }),
  ];
  const RESULT = [{
    position: 2, driver_number: 3, number_of_laps: 25, dnf: false, dns: false, dsq: false,
    duration: 96.136, gap_to_leader: 0.084, meeting_key: 1297, session_key: 11389,
  }];

  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function serve(result: unknown[]) {
    const fetchSpy = vi.fn(async (input: string | URL | Request) => {
      const path = new URL(String(input)).pathname;
      const body =
        path.endsWith("/laps") ? LAPS
        : path.endsWith("/drivers") ? [VER]
        : path.endsWith("/session_result") ? result
        : [session(11389, "Practice 1", "2026-10-23T17:30:00+00:00", "2026-10-23T18:30:00+00:00")];
      return new Response(JSON.stringify(body), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchSpy);
    return fetchSpy;
  }

  it("takes the best lap and position from the official classification", async () => {
    serve(RESULT);

    const [ver] = await getDriverPerformances(11389);
    expect(ver!.bestLapTime).toBe(96.136);
    expect(ver!.position).toBe(2);
  });

  it("falls back to the laps while the classification is not out yet", async () => {
    serve([]);

    const [ver] = await getDriverPerformances(11389);
    expect(ver!.bestLapTime).toBe(95.86);
    expect(ver!.position).toBeNull();
  });

  it("asks again for a classification that was still empty", async () => {
    const fetchSpy = serve([]);

    await getDriverPerformances(11389);
    await getDriverPerformances(11389);
    const resultCalls = fetchSpy.mock.calls.filter(([input]) => String(input).includes("/session_result"));
    expect(resultCalls).toHaveLength(2);
  });
});
