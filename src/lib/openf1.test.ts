import { describe, it, expect } from "vitest";
import { findBestLap, findBestSectors, findTopSpeed } from "./openf1";
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
