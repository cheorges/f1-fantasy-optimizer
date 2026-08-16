import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readCache, writeCache } from "./browser-cache";

// Mirrors the key format in browser-cache.ts. Pinned on purpose: changing the prefix or the
// version silently orphans every cached entry, which should be a deliberate act.
const KEY = "f1-cache:v1:sessions";

interface Payload {
  value: number;
}

function isPayload(data: unknown): data is Payload {
  return typeof data === "object" && data !== null && typeof (data as Payload).value === "number";
}

describe("browser cache", () => {
  let stored: Record<string, string>;
  let failNextWrite: boolean;

  beforeEach(() => {
    stored = {};
    failNextWrite = false;
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => stored[key] ?? null,
      setItem: (key: string, value: string) => {
        if (failNextWrite) {
          failNextWrite = false;
          throw new DOMException("quota", "QuotaExceededError");
        }
        stored[key] = value;
      },
      removeItem: (key: string) => { delete stored[key]; },
      key: (i: number) => Object.keys(stored)[i] ?? null,
      get length() { return Object.keys(stored).length; },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips a value and stamps it with a time", () => {
    const before = Date.now();
    writeCache("sessions", { value: 42 });

    const entry = readCache("sessions", isPayload);
    expect(entry?.data).toEqual({ value: 42 });
    expect(entry!.savedAt).toBeGreaterThanOrEqual(before);
  });

  it("returns null when nothing was cached", () => {
    expect(readCache("sessions", isPayload)).toBeNull();
  });

  it("ignores an entry written under a different version", () => {
    stored["f1-cache:v0:sessions"] = JSON.stringify({ savedAt: Date.now(), data: { value: 1 } });
    expect(readCache("sessions", isPayload)).toBeNull();
  });

  it("ignores unparseable JSON instead of throwing", () => {
    stored[KEY] = "not json";
    expect(readCache("sessions", isPayload)).toBeNull();
  });

  it("rejects a payload that fails the caller's shape check", () => {
    stored[KEY] = JSON.stringify({ savedAt: Date.now(), data: { value: "not a number" } });
    expect(readCache("sessions", isPayload)).toBeNull();
  });

  it("rejects an entry with no usable timestamp", () => {
    stored[KEY] = JSON.stringify({ data: { value: 1 } });
    expect(readCache("sessions", isPayload)).toBeNull();
  });

  it("clears its own keys and retries once when the quota is exceeded", () => {
    stored["f1-cache:v0:stale"] = "old";
    stored["unrelated-app-key"] = "keep me";
    failNextWrite = true;

    writeCache("sessions", { value: 7 });

    expect(readCache("sessions", isPayload)?.data).toEqual({ value: 7 });
    expect(stored["f1-cache:v0:stale"]).toBeUndefined();
    expect(stored["unrelated-app-key"]).toBe("keep me");
  });

  it("is inert during server rendering", () => {
    vi.stubGlobal("window", undefined);
    expect(() => writeCache("sessions", { value: 1 })).not.toThrow();
    expect(readCache("sessions", isPayload)).toBeNull();
  });
});
