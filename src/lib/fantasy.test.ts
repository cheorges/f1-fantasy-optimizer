import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getFantasyData, getDriverPrices } from "./fantasy";
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
