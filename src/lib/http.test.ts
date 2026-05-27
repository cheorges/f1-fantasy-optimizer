import { describe, it, expect, afterEach, vi } from "vitest";
import { fetchWithRetry } from "./http";

describe("fetchWithRetry", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("returns immediately on a successful response without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("http://x");
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a 4xx immediately without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await fetchWithRetry("http://x");
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx and returns the final response", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("http://x", 3);
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("recovers when a later attempt succeeds", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("http://x", 3);
    await vi.runAllTimersAsync();
    const res = await promise;

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries on persistent network errors", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new Error("boom"));
    vi.stubGlobal("fetch", fetchMock);

    const promise = fetchWithRetry("http://x", 2).catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBeInstanceOf(Error);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
