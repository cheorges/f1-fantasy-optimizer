import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getFantasyData, getDriverPrices, FantasyRoundNotPublishedError } from "./fantasy";
import { clearCache } from "./cache";

const ERGAST = {
  MRData: { RaceTable: { Races: [{ round: "5", date: "2099-01-01" }] } },
};

// Mirrors the upstream feed's actual (typo'd) keys: FUllName, OverallPpints, etc.
const FANTASY = {
  Data: {
    Value: [
      {
        PlayerId: "44",
        Skill: 1,
        Value: 27,
        FUllName: "Lewis Hamilton",
        TeamName: "Ferrari",
        IsActive: "1",
        DriverTLA: "ham",
        OverallPpints: "134",
        GamedayPoints: "12",
        SelectedPercentage: "38.9",
        OldPlayerValue: 27.5,
        FirstName: "Lewis",
        LastName: "Hamilton",
      },
      {
        PlayerId: "200",
        Skill: 2,
        Value: 30,
        FUllName: "Ferrari",
        TeamName: "Ferrari",
        IsActive: "1",
        DriverTLA: "",
        OverallPpints: "201",
        GamedayPoints: "20",
        SelectedPercentage: "43.1",
        OldPlayerValue: 30.3,
        FirstName: "",
        LastName: "",
      },
      {
        PlayerId: "99",
        Skill: 1,
        Value: 5,
        FUllName: "Inactive Driver",
        TeamName: "Test",
        IsActive: "0",
        DriverTLA: "INA",
        OverallPpints: "0",
        GamedayPoints: "0",
        SelectedPercentage: "0",
        OldPlayerValue: 5,
        FirstName: "In",
        LastName: "Active",
      },
    ],
  },
};

function mockFetch() {
  return vi.fn(async (url: string) => {
    if (url.includes("jolpi.ca")) return new Response(JSON.stringify(ERGAST), { status: 200 });
    return new Response(JSON.stringify(FANTASY), { status: 200 });
  });
}

describe("getFantasyData", () => {
  beforeEach(() => {
    clearCache();
    vi.stubGlobal("fetch", mockFetch());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the round derived from the calendar", async () => {
    const data = await getFantasyData();
    expect(data.round).toBe(5);
  });

  it("maps the typo'd upstream keys onto driver fields", async () => {
    const data = await getFantasyData();
    expect(data.drivers).toHaveLength(1);
    const driver = data.drivers[0]!;
    expect(driver.id).toBe(44);
    expect(driver.overallPoints).toBe(134);
    expect(driver.priceChange).toBeCloseTo(-0.5);
    expect(driver.tla).toBe("ham");
  });

  it("maps constructors from the FUllName field", async () => {
    const data = await getFantasyData();
    expect(data.constructors).toHaveLength(1);
    expect(data.constructors[0]!.name).toBe("Ferrari");
    expect(data.constructors[0]!.overallPoints).toBe(201);
  });

  it("excludes inactive players", async () => {
    const data = await getFantasyData();
    const ids = [...data.drivers, ...data.constructors].map((p) => p.id);
    expect(ids).not.toContain(99);
  });
});

// The feed for the next round only appears once the game has rolled over after the race,
// and the CDN answers for a missing one with 403. Seen on 2026-10-17 for round 19.
describe("getFantasyData when the calendar round has no feed yet", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function feedFor(round: number, statusByRound: Record<number, number>) {
    return vi.fn(async (url: string) => {
      if (url.includes("jolpi.ca")) {
        return new Response(JSON.stringify({
          MRData: { RaceTable: { Races: [{ round: String(round), date: "2099-01-01" }] } },
        }), { status: 200 });
      }
      const requested = Number(url.match(/\/(\d+)_en\.json$/)?.[1]);
      const status = statusByRound[requested] ?? 200;
      return status === 200
        ? new Response(JSON.stringify(FANTASY), { status: 200 })
        : new Response("<Error><Code>AccessDenied</Code></Error>", { status });
    });
  }

  beforeEach(() => {
    clearCache();
  });

  it("falls back to the previous round's prices", async () => {
    vi.stubGlobal("fetch", feedFor(19, { 19: 403 }));

    const data = await getFantasyData();
    expect(data.round).toBe(18);
    expect(data.drivers[0]!.id).toBe(44);
  });

  it("takes the new round as soon as its feed exists", async () => {
    vi.stubGlobal("fetch", feedFor(19, { 19: 403 }));
    expect((await getFantasyData()).round).toBe(18);

    vi.stubGlobal("fetch", feedFor(19, {}));
    expect((await getFantasyData()).round).toBe(19);
  });

  it("does not fall back on a server error", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", feedFor(19, { 19: 500 }));

    const result = getFantasyData().catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const error = await result;

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(FantasyRoundNotPublishedError);
  });

  it("has nothing to fall back to in round 1", async () => {
    vi.stubGlobal("fetch", feedFor(1, { 1: 403 }));
    await expect(getFantasyData()).rejects.toBeInstanceOf(FantasyRoundNotPublishedError);
  });
});

describe("getDriverPrices", () => {
  beforeEach(() => {
    clearCache();
    vi.stubGlobal("fetch", mockFetch());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keys drivers by their uppercased TLA", async () => {
    const prices = await getDriverPrices();
    expect(prices.get("HAM")?.id).toBe(44);
  });
});
