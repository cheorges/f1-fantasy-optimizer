import { describe, it, expect } from "vitest";
import { getTeamSuggestions } from "./team-optimizer";
import type { FantasyDriver, FantasyConstructor } from "./types";

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
