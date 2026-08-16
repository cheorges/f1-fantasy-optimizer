import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { findBestLap, findBestSectors, findTopSpeed, getSessionDrivers, getSessionLaps } from "./openf1";
import { clearCache } from "./cache";
import type { Lap } from "./types";

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
