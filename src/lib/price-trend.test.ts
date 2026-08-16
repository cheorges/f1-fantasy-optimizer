import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { classify, getPriceTrends } from "./price-trend";
import { clearCache } from "./cache";

// price and ownership per round, keyed by player id
type Series = Record<string, { price: number[]; owned: number[] }>;

function player(id: string, skill: number, price: number, owned: number) {
  return {
    PlayerId: id,
    Skill: skill,
    Value: price,
    FUllName: `Player ${id}`,
    TeamName: "Test",
    IsActive: "1",
    DriverTLA: `P${id}`,
    OverallPpints: "0",
    GamedayPoints: "0",
    SelectedPercentage: String(owned),
    OldPlayerValue: price,
    FirstName: "Test",
    LastName: `Player ${id}`,
  };
}

// Rounds are 1-based; index 0 of each series is round 1.
function mockFeed(series: Series) {
  return vi.fn(async (url: string) => {
    const round = parseInt(url.match(/\/(\d+)_en\.json/)![1]!, 10);
    const values = Object.entries(series)
      .filter(([, s]) => s.price[round - 1] !== undefined)
      .map(([id, s], i) => player(id, i === 0 ? 1 : 2, s.price[round - 1]!, s.owned[round - 1]!));
    return new Response(JSON.stringify({ Data: { Value: values } }), { status: 200 });
  });
}

describe("classify", () => {
  it("calls it rising when price and ownership both climb", () => {
    expect(classify(0.6, 3)).toBe("up");
  });

  it("calls it falling when price and ownership both drop", () => {
    expect(classify(-0.4, -2)).toBe("down");
  });

  it("still commits when one signal moves and the other holds", () => {
    expect(classify(0.3, 0)).toBe("up");
    expect(classify(0, -1)).toBe("down");
  });

  it("refuses to pick a direction when the signals disagree", () => {
    expect(classify(0.5, -4)).toBe("flat");
    expect(classify(-0.5, 4)).toBe("flat");
  });

  it("is flat when nothing moved at all", () => {
    expect(classify(0, 0)).toBe("flat");
  });
});

describe("getPriceTrends", () => {
  beforeEach(() => {
    clearCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("compares the current round against the start of the window", async () => {
    vi.stubGlobal("fetch", mockFeed({
      // rising, falling, and a conflicted case that must land on flat
      "1": { price: [20, 20.4, 21], owned: [10, 12, 15] },
      "2": { price: [30, 29.5, 29], owned: [40, 38, 35] },
      "3": { price: [10, 10.5, 11], owned: [25, 22, 20] },
    }));

    const trends = await getPriceTrends(3);

    expect(trends.get(1)).toBe("up");
    expect(trends.get(2)).toBe("down");
    expect(trends.get(3)).toBe("flat");
  });

  it("returns nothing when the window reaches before round 1", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect((await getPriceTrends(2)).size).toBe(0);
    expect((await getPriceTrends(1)).size).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("skips players that did not exist at the start of the window", async () => {
    vi.stubGlobal("fetch", mockFeed({
      "1": { price: [20, 20.5, 21], owned: [10, 11, 12] },
      "2": { price: [], owned: [] },
    }));

    const trends = await getPriceTrends(3);

    expect(trends.get(1)).toBe("up");
    expect(trends.has(2)).toBe(false);
  });
});
