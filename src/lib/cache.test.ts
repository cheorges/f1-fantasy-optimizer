import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { clearCache, getCached, setCache } from "./cache";

describe("cache", () => {
  beforeEach(() => {
    clearCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns stored values before expiry and null after", () => {
    setCache("k", { value: 1 }, 1000);
    expect(getCached<{ value: number }>("k")).toEqual({ value: 1 });

    vi.advanceTimersByTime(1001);
    expect(getCached("k")).toBeNull();
  });

  it("returns null for missing keys", () => {
    expect(getCached("nope")).toBeNull();
  });

  it("caps the store at 100 entries, evicting the soonest to expire", () => {
    // Entry "short" expires first; the rest expire much later.
    setCache("short", "x", 1000);
    for (let i = 0; i < 100; i++) {
      setCache(`long-${i}`, "x", 1_000_000);
    }
    // Inserting the 101st distinct key triggers eviction of "short".
    expect(getCached("short")).toBeNull();
    expect(getCached("long-0")).toBe("x");
  });
});
