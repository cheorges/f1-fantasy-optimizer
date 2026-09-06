import { describe, it, expect } from "vitest";
import { parseSnapshot, parseLapTime } from "./livetiming";
import { isSessionOver } from "./live-session";

// A trimmed copy of a real Subscribe reply, taken during the third practice session at
// Monza. Field names and shapes are the feed's, not ours.
function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    SessionInfo: {
      Meeting: { Name: "Italian Grand Prix", Location: "Monza" },
      Name: "Practice 3",
      Type: "Practice",
    },
    SessionStatus: { Status: "Started", Started: "Started" },
    ExtrapolatedClock: { Remaining: "00:20:46", Extrapolating: true },
    TrackStatus: { Status: "1", Message: "AllClear" },
    DriverList: {
      "63": { Tla: "RUS", FullName: "George Russell", TeamName: "Mercedes", TeamColour: "00D7B6" },
      "12": { Tla: "ANT", FullName: "Kimi Antonelli", TeamName: "Mercedes", TeamColour: "00D7B6" },
    },
    TimingData: {
      Lines: {
        "12": {
          Position: "2",
          TimeDiffToFastest: "+0.345",
          BestLapTime: { Value: "1:23.032", Lap: 2 },
          NumberOfLaps: 8,
          InPit: true,
        },
        "63": {
          Position: "1",
          TimeDiffToFastest: "",
          BestLapTime: { Value: "1:22.687", Lap: 5 },
          NumberOfLaps: 6,
          InPit: false,
        },
      },
    },
    ...overrides,
  };
}

describe("parseSnapshot", () => {
  it("orders drivers by position regardless of key order", () => {
    const result = parseSnapshot(snapshot());
    expect(result.drivers.map((d) => d.acronym)).toEqual(["RUS", "ANT"]);
  });

  it("carries lap time, gap, laps and pit state across", () => {
    const [leader, second] = parseSnapshot(snapshot()).drivers;

    expect(leader.bestLapTime).toBe("1:22.687");
    // The leader has no gap to itself; the feed sends an empty string for it.
    expect(leader.gapToLeader).toBeNull();
    expect(leader.laps).toBe(6);
    expect(leader.inPit).toBe(false);

    expect(second.gapToLeader).toBe("+0.345");
    expect(second.inPit).toBe(true);
  });

  it("reads the session header", () => {
    const result = parseSnapshot(snapshot());
    expect(result.sessionName).toBe("Practice 3");
    expect(result.meetingName).toBe("Italian Grand Prix");
    expect(result.trackStatus).toBe("AllClear");
    expect(result.remaining).toBe("00:20:46");
    expect(result.fastestLap).toBe("1:22.687");
  });

  it("counts only Started and Aborted as live", () => {
    const state = (status: string) =>
      parseSnapshot(snapshot({ SessionStatus: { Status: status } })).live;

    expect(state("Started")).toBe(true);
    // A red flag stops the cars, not the session.
    expect(state("Aborted")).toBe(true);
    expect(state("Inactive")).toBe(false);
    expect(state("Finished")).toBe(false);
    expect(state("Finalised")).toBe(false);
  });

  it("sorts drivers without a position last instead of leading", () => {
    const base = snapshot();
    const result = parseSnapshot(
      snapshot({
        TimingData: {
          Lines: {
            ...base.TimingData.Lines,
            "44": { Position: "", BestLapTime: { Value: "" }, NumberOfLaps: 0, InPit: false },
          },
        },
      }),
    );

    expect(result.drivers.map((d) => d.driverNumber)).toEqual(["63", "12", "44"]);
    expect(result.fastestLap).toBe("1:22.687");
  });

  it("survives a driver missing from the driver list", () => {
    const raw = snapshot({ DriverList: {} });
    const result = parseSnapshot(raw);

    // Falls back to the racing number rather than rendering a blank row.
    expect(result.drivers[0].acronym).toBe("63");
    expect(result.drivers[0].bestLapTime).toBe("1:22.687");
  });

  it("returns an empty session rather than throwing on an unrecognisable payload", () => {
    const result = parseSnapshot({});
    expect(result.drivers).toEqual([]);
    expect(result.live).toBe(false);
    expect(result.fastestLap).toBeNull();
  });

  it("names the quickest lap of the session, not the leader's", () => {
    // A race: Position is race position, and the leader is not on the quickest lap.
    const result = parseSnapshot(
      snapshot({
        TimingData: {
          Lines: {
            "63": {
              Position: "1",
              BestLapTime: { Value: "1:24.900" },
              NumberOfLaps: 30,
              InPit: false,
            },
            "12": {
              Position: "2",
              BestLapTime: { Value: "1:23.100" },
              NumberOfLaps: 30,
              InPit: false,
            },
          },
        },
      }),
    );

    expect(result.fastestLap).toBe("1:23.100");
    expect(result.fastestDriverNumber).toBe("12");
  });

  it("ignores drivers without a lap when picking the quickest", () => {
    const result = parseSnapshot(
      snapshot({
        TimingData: {
          Lines: {
            "63": { Position: "1", BestLapTime: { Value: "" }, NumberOfLaps: 0, InPit: false },
            "12": {
              Position: "2",
              BestLapTime: { Value: "1:23.032" },
              NumberOfLaps: 8,
              InPit: false,
            },
          },
        },
      }),
    );

    expect(result.fastestDriverNumber).toBe("12");
  });
});

describe("parseLapTime", () => {
  it("reads the feed's minute:second format", () => {
    expect(parseLapTime("1:22.687")).toBeCloseTo(82.687, 3);
    expect(parseLapTime("2:07.269")).toBeCloseTo(127.269, 3);
  });

  it("reads a bare seconds value", () => {
    expect(parseLapTime("46.998")).toBeCloseTo(46.998, 3);
  });

  it("returns null for what the feed sends before a driver has a lap", () => {
    expect(parseLapTime("")).toBeNull();
    expect(parseLapTime(null)).toBeNull();
    expect(parseLapTime("no time")).toBeNull();
  });
});

describe("isSessionOver", () => {
  it("stops on the terminal states only", () => {
    expect(isSessionOver("Finished")).toBe(true);
    expect(isSessionOver("Finalised")).toBe(true);
    expect(isSessionOver("Ends")).toBe(true);
  });

  it("keeps a session that has not started yet open", () => {
    // The reason the live page keeps polling before the green light.
    expect(isSessionOver("Inactive")).toBe(false);
    expect(isSessionOver("Started")).toBe(false);
    expect(isSessionOver("Aborted")).toBe(false);
  });
});
