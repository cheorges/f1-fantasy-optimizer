import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getTeamSuggestions, mergePracticeSwaps, loadTeams, saveTeams, makeTeam, MAX_TEAMS } from "./team-optimizer";
import type { FantasyDriver, FantasyConstructor } from "./types";

// Pinned on purpose: renaming this key would orphan every saved team.
const STORAGE_KEY = "f1-fantasy-team";

function driver(overrides: Partial<FantasyDriver>): FantasyDriver {
  return {
    id: 1,
    firstName: "Test",
    lastName: "Driver",
    tla: "TST",
    teamName: "Test Team",
    price: 20,
    selectedPercentage: 0,
    overallPoints: 100,
    gamedayPoints: 0,
    priceChange: 0,
    trend: null,
    ...overrides,
  };
}

function constructor(overrides: Partial<FantasyConstructor>): FantasyConstructor {
  return {
    id: 100,
    name: "Test Constructor",
    price: 20,
    selectedPercentage: 0,
    overallPoints: 100,
    gamedayPoints: 0,
    priceChange: 0,
    trend: null,
    ...overrides,
  };
}

describe("getTeamSuggestions", () => {
  it("only suggests candidates with more points than the current pick", () => {
    const drivers = [
      driver({ id: 1, overallPoints: 100, price: 20 }),
      driver({ id: 2, overallPoints: 150, price: 20 }),
      driver({ id: 3, overallPoints: 80, price: 20 }),
    ];
    const suggestions = getTeamSuggestions([1], [], drivers, [], 100);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.upgrade.id).toBe(2);
    expect(suggestions[0]!.pointsDelta).toBe(50);
  });

  it("excludes candidates already in the selected team", () => {
    const drivers = [
      driver({ id: 1, overallPoints: 100 }),
      driver({ id: 2, overallPoints: 150 }),
    ];
    // Both selected — the higher-points one is already owned, so no upgrade exists.
    const suggestions = getTeamSuggestions([1, 2], [], drivers, [], 100);
    expect(suggestions).toHaveLength(0);
  });

  it("excludes upgrades whose price delta exceeds the remaining budget", () => {
    const drivers = [
      driver({ id: 1, overallPoints: 100, price: 20 }),
      driver({ id: 2, overallPoints: 150, price: 25 }),
    ];
    expect(getTeamSuggestions([1], [], drivers, [], 4)).toHaveLength(0);
    expect(getTeamSuggestions([1], [], drivers, [], 5)).toHaveLength(1);
  });

  it("sorts suggestions by largest points improvement first", () => {
    const drivers = [
      driver({ id: 1, overallPoints: 100, price: 20 }),
      driver({ id: 2, overallPoints: 120, price: 20 }),
      driver({ id: 3, overallPoints: 200, price: 20 }),
    ];
    const suggestions = getTeamSuggestions([1], [], drivers, [], 100);
    expect(suggestions.map((s) => s.upgrade.id)).toEqual([3, 2]);
  });

  it("suggests constructor upgrades alongside drivers", () => {
    const drivers = [
      driver({ id: 1, overallPoints: 100 }),
      driver({ id: 2, overallPoints: 150 }),
    ];
    const constructors = [
      constructor({ id: 100, overallPoints: 100 }),
      constructor({ id: 101, overallPoints: 130 }),
    ];
    const suggestions = getTeamSuggestions([1], [100], drivers, constructors, 100);
    expect(suggestions.map((s) => s.type).sort()).toEqual(["constructor", "driver"]);
  });
});

describe("team storage", () => {
  let stored: Record<string, string>;

  beforeEach(() => {
    stored = {};
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => stored[key] ?? null,
      setItem: (key: string, value: string) => { stored[key] = value; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with one empty team when nothing is stored", () => {
    const store = loadTeams();
    expect(store.teams).toHaveLength(1);
    expect(store.activeId).toBe(store.teams[0]!.id);
    expect(store.teams[0]!.driverIds).toEqual([]);
  });

  it("lifts a pre-v2 bare team into the versioned store instead of dropping it", () => {
    stored[STORAGE_KEY] = JSON.stringify({ driverIds: [1, 2, 3], constructorIds: [100] });

    const store = loadTeams();

    expect(store.version).toBe(4);
    expect(store.teams).toHaveLength(1);
    expect(store.teams[0]!.driverIds).toEqual([1, 2, 3]);
    expect(store.teams[0]!.constructorIds).toEqual([100]);
    expect(store.teams[0]!.name).toBe("Team 1");
  });

  it("round-trips a multi-team store", () => {
    const original = {
      version: 4 as const,
      // Non-zero on purpose: `makeTeam()` returns 0, so a suite built only from it would
      // still pass if `parseTeam` dropped the stored figure on every load — the one number
      // the app cannot derive and the user copies in by hand.
      teams: [makeTeam(0), { ...makeTeam(1), name: "Mini League", driverIds: [7, null, 9], availableBudget: 1.4 }],
      activeId: makeTeam(1).id,
    };
    saveTeams(original);

    const store = loadTeams();
    expect(store.teams).toHaveLength(2);
    expect(store.teams[1]!.name).toBe("Mini League");
    expect(store.teams[1]!.driverIds).toEqual([7, null, 9]);
    expect(store.teams[1]!.availableBudget).toBe(1.4);
    expect(store.activeId).toBe(makeTeam(1).id);
  });

  it("never returns more teams than the cap", () => {
    saveTeams({
      version: 4,
      teams: [makeTeam(0), makeTeam(1), makeTeam(2), makeTeam(3), makeTeam(4)],
      activeId: makeTeam(0).id,
    });
    expect(loadTeams().teams).toHaveLength(MAX_TEAMS);
  });

  it("falls back to an empty store on unparseable or malformed data", () => {
    stored[STORAGE_KEY] = "not json";
    expect(loadTeams().teams).toHaveLength(1);

    stored[STORAGE_KEY] = JSON.stringify({ driverIds: "nope", constructorIds: [] });
    expect(loadTeams().teams[0]!.driverIds).toEqual([]);
  });

  it("does not read a v3 budget correction as an available budget", () => {
    // v3 stored a correction against market value. Reading 7.5 as free budget would put
    // the team at 92.5M spent when nothing about its actual spend is known.
    stored[STORAGE_KEY] = JSON.stringify({
      version: 3,
      teams: [{ id: "team-1", name: "Team 1", driverIds: [1], constructorIds: [100], budgetCorrection: 7.5 }],
      activeId: "team-1",
    });

    const store = loadTeams();

    expect(store.version).toBe(4);
    expect(store.teams[0]!.availableBudget).toBe(0);
    expect(store.teams[0]!.driverIds).toEqual([1]);
  });

  it("does not read a v2 remaining budget as an available budget", () => {
    // v2 stored `budget` meaning "remaining budget". Closer in spirit, but it was entered
    // against prices from another day and there is nothing to check it against.
    stored[STORAGE_KEY] = JSON.stringify({
      version: 2,
      teams: [{ id: "team-1", name: "Team 1", driverIds: [1], constructorIds: [100], budget: 7.5 }],
      activeId: "team-1",
    });

    const store = loadTeams();

    expect(store.version).toBe(4);
    expect(store.teams[0]!.availableBudget).toBe(0);
    expect(store.teams[0]!.driverIds).toEqual([1]);
  });

  it("falls back to the first team when the stored active id is gone", () => {
    saveTeams({ version: 4, teams: [makeTeam(0)], activeId: "team-does-not-exist" });
    expect(loadTeams().activeId).toBe(makeTeam(0).id);
  });
});

describe("mergePracticeSwaps", () => {
  const drivers = [
    driver({ id: 1, tla: "AAA", lastName: "Alpha", overallPoints: 100, price: 20 }),
    driver({ id: 2, tla: "BBB", lastName: "Bravo", overallPoints: 130, price: 21 }),
    driver({ id: 3, tla: "CCC", lastName: "Charlie", overallPoints: 40, price: 19 }),
  ];

  function analysis(acronym: string) {
    return { nameAcronym: acronym } as never;
  }

  function swap(out: string, into: string, timeDelta: number) {
    return { driverOut: analysis(out), driverIn: analysis(into), timeDelta } as never;
  }

  it("keeps points entries first and appends pace-only ones by time gained", () => {
    const points = getTeamSuggestions([1], [], drivers, [], 100);
    // Charlie is slower on points but quicker on track; Bravo qualifies both ways.
    const merged = mergePracticeSwaps(
      points,
      [swap("AAA", "CCC", 0.4), swap("AAA", "BBB", 0.2)],
      [],
      drivers,
      [],
    );

    expect(merged.map((s) => s.qualifiedBy)).toEqual(["both", "pace"]);
    expect(merged[0]!.upgrade.id).toBe(2);
    expect(merged[0]!.timeDelta).toBe(0.2);
    expect(merged[1]!.upgrade.id).toBe(3);
  });

  it("does not duplicate an entry that qualifies on both grounds", () => {
    const points = getTeamSuggestions([1], [], drivers, [], 100);
    const merged = mergePracticeSwaps(points, [swap("AAA", "BBB", 0.3)], [], drivers, []);

    expect(merged).toHaveLength(1);
    expect(merged[0]!.qualifiedBy).toBe("both");
    expect(merged[0]!.pointsDelta).toBe(30);
  });

  it("skips a practice driver that has no Fantasy entry", () => {
    const merged = mergePracticeSwaps([], [swap("AAA", "ZZZ", 0.5)], [], drivers, []);
    expect(merged).toHaveLength(0);
  });
});
