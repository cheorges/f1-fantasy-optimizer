import { describe, it, expect } from "vitest";
import { generateRecommendations, generateConstructorRecommendations } from "./swaps";
import type { DriverAnalysis, ConstructorAnalysis } from "./types";

function driver(overrides: Partial<DriverAnalysis>): DriverAnalysis {
  return {
    driverNumber: 1,
    firstName: "Test",
    lastName: "Driver",
    nameAcronym: "TST",
    teamName: "Test Team",
    teamColour: "000000",
    headshotUrl: null,
    bestLapTime: 90,
    bestSectors: { sector1: null, sector2: null, sector3: null },
    topSpeed: null,
    lapCount: 10,
    price: 20,
    priceChange: 0,
    selectedPercentage: 0,
    overallPoints: 0,
    valueScore: 0.5,
    sessionName: "Practice 2",
    ...overrides,
  };
}

function constructor(overrides: Partial<ConstructorAnalysis>): ConstructorAnalysis {
  return {
    name: "Test Team",
    teamColour: "000000",
    bestLapTime: 90,
    avgLapTime: 90,
    drivers: ["AAA", "BBB"],
    price: 20,
    priceChange: 0,
    selectedPercentage: 0,
    overallPoints: 0,
    valueScore: 0.5,
    ...overrides,
  };
}

describe("generateRecommendations", () => {
  it("excludes entries with null lap time or null price", () => {
    const drivers = [
      driver({ driverNumber: 1, nameAcronym: "AAA", bestLapTime: 90, price: 20 }),
      driver({ driverNumber: 2, nameAcronym: "BBB", bestLapTime: null, price: 20 }),
      driver({ driverNumber: 3, nameAcronym: "CCC", bestLapTime: 88, price: null }),
    ];
    const recs = generateRecommendations(drivers, 100);
    // Only driver 1 has full data — no valid pair, so no recs.
    expect(recs).toHaveLength(0);
  });

  it("only recommends swaps to a faster driver", () => {
    const drivers = [
      driver({ driverNumber: 1, nameAcronym: "SLOW", bestLapTime: 92, price: 20 }),
      driver({ driverNumber: 2, nameAcronym: "FAST", bestLapTime: 90, price: 20 }),
    ];
    const recs = generateRecommendations(drivers, 100);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.driverOut.nameAcronym).toBe("SLOW");
    expect(recs[0]!.driverIn.nameAcronym).toBe("FAST");
    expect(recs[0]!.timeDelta).toBeCloseTo(2);
  });

  it("excludes swaps whose price delta exceeds the budget", () => {
    const drivers = [
      driver({ driverNumber: 1, nameAcronym: "SLOW", bestLapTime: 92, price: 20 }),
      driver({ driverNumber: 2, nameAcronym: "FAST", bestLapTime: 90, price: 25 }),
    ];
    expect(generateRecommendations(drivers, 4)).toHaveLength(0);
    expect(generateRecommendations(drivers, 5)).toHaveLength(1);
  });

  it("describes a cheaper, faster swap", () => {
    const drivers = [
      driver({ driverNumber: 1, nameAcronym: "SLOW", bestLapTime: 92, price: 25 }),
      driver({ driverNumber: 2, nameAcronym: "FAST", bestLapTime: 90, price: 20 }),
    ];
    const recs = generateRecommendations(drivers, 100);
    expect(recs[0]!.reason).toContain("cheaper");
    expect(recs[0]!.priceDelta).toBeCloseTo(-5);
  });

  it("sorts by largest time improvement first", () => {
    const drivers = [
      driver({ driverNumber: 1, nameAcronym: "SLOW", bestLapTime: 95, price: 20 }),
      driver({ driverNumber: 2, nameAcronym: "MID", bestLapTime: 92, price: 20 }),
      driver({ driverNumber: 3, nameAcronym: "FAST", bestLapTime: 90, price: 20 }),
    ];
    const recs = generateRecommendations(drivers, 100);
    expect(recs[0]!.timeDelta).toBeGreaterThanOrEqual(recs[1]!.timeDelta);
  });
});

describe("generateConstructorRecommendations", () => {
  it("compares on average lap time, not best lap time", () => {
    // B is faster on average (90 < 91) but slower on best lap (88 > ... wait, lower is faster):
    // best lap: A=89, B=88 → B has the better single lap. avg: A=90, B=91 → A is better on average.
    // The recommendation must follow avg: swap OUT B, swap IN A.
    const constructors = [
      constructor({ name: "A", avgLapTime: 90, bestLapTime: 89, price: 30 }),
      constructor({ name: "B", avgLapTime: 91, bestLapTime: 88, price: 28 }),
    ];
    const recs = generateConstructorRecommendations(constructors, 100);
    expect(recs).toHaveLength(1);
    expect(recs[0]!.constructorOut.name).toBe("B");
    expect(recs[0]!.constructorIn.name).toBe("A");
    expect(recs[0]!.timeDelta).toBeCloseTo(1);
  });
});
