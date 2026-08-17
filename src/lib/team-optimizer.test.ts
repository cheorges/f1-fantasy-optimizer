import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getTeamSuggestions, loadTeams, saveTeams, makeTeam, MAX_TEAMS } from "./team-optimizer";
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

    expect(store.version).toBe(3);
    expect(store.teams).toHaveLength(1);
    expect(store.teams[0]!.driverIds).toEqual([1, 2, 3]);
    expect(store.teams[0]!.constructorIds).toEqual([100]);
    expect(store.teams[0]!.name).toBe("Team 1");
  });

  it("round-trips a multi-team store", () => {
    const original = {
      version: 3 as const,
      teams: [makeTeam(0), { ...makeTeam(1), name: "Mini League", driverIds: [7, null, 9] }],
      activeId: makeTeam(1).id,
    };
    saveTeams(original);

    const store = loadTeams();
    expect(store.teams).toHaveLength(2);
    expect(store.teams[1]!.name).toBe("Mini League");
    expect(store.teams[1]!.driverIds).toEqual([7, null, 9]);
    expect(store.activeId).toBe(makeTeam(1).id);
  });

  it("never returns more teams than the cap", () => {
    saveTeams({
      version: 3,
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

  it("does not read a v2 remaining budget as a correction", () => {
    // v2 stored `budget` meaning "remaining budget" — a different quantity. Carrying the
    // number over would silently shift the team's effective cost by that amount.
    stored[STORAGE_KEY] = JSON.stringify({
      version: 2,
      teams: [{ id: "team-1", name: "Team 1", driverIds: [1], constructorIds: [100], budget: 7.5 }],
      activeId: "team-1",
    });

    const store = loadTeams();

    expect(store.version).toBe(3);
    expect(store.teams[0]!.budgetCorrection).toBe(0);
    expect(store.teams[0]!.driverIds).toEqual([1]);
  });

  it("falls back to the first team when the stored active id is gone", () => {
    saveTeams({ version: 3, teams: [makeTeam(0)], activeId: "team-does-not-exist" });
    expect(loadTeams().activeId).toBe(makeTeam(0).id);
  });
});
