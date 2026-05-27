import { describe, it, expect } from "vitest";
import { getLiveSessionMessage } from "./live-session";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("getLiveSessionMessage", () => {
  it("returns null for a successful response", async () => {
    expect(await getLiveSessionMessage(new Response(null, { status: 200 }))).toBeNull();
  });

  it("returns null for a non-503 error", async () => {
    expect(await getLiveSessionMessage(jsonResponse({ code: "LIVE_SESSION" }, 500))).toBeNull();
  });

  it("returns the error message for a 503 LIVE_SESSION response", async () => {
    const res = jsonResponse({ code: "LIVE_SESSION", error: "Session in progress" }, 503);
    expect(await getLiveSessionMessage(res)).toBe("Session in progress");
  });

  it("falls back to a default message when error text is missing", async () => {
    expect(await getLiveSessionMessage(jsonResponse({ code: "LIVE_SESSION" }, 503))).toBe(
      "Live session in progress",
    );
  });

  it("returns null for a 503 without the LIVE_SESSION code", async () => {
    expect(await getLiveSessionMessage(jsonResponse({ error: "boom" }, 503))).toBeNull();
  });

  it("returns null when the 503 body is not valid JSON", async () => {
    expect(await getLiveSessionMessage(new Response("not json", { status: 503 }))).toBeNull();
  });
});
