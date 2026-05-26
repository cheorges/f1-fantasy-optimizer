import { describe, it, expect } from "vitest";
import { canonicalTeam } from "./team-names";

describe("canonicalTeam", () => {
  it("maps OpenF1 and Fantasy variants of the same team to one key", () => {
    expect(canonicalTeam("Red Bull Racing")).toBe(canonicalTeam("Oracle Red Bull Racing"));
    expect(canonicalTeam("Kick Sauber")).toBe(canonicalTeam("Stake F1 Team Kick Sauber"));
    expect(canonicalTeam("RB")).toBe(canonicalTeam("Visa Cash App RB"));
  });

  it("keeps distinct teams distinct (no false merge)", () => {
    expect(canonicalTeam("Red Bull Racing")).not.toBe(canonicalTeam("RB"));
    expect(canonicalTeam("McLaren")).not.toBe(canonicalTeam("Ferrari"));
  });

  it("is case- and whitespace-insensitive", () => {
    expect(canonicalTeam("  ferrari  ")).toBe(canonicalTeam("Ferrari"));
  });

  it("falls back to the uppercased name for unknown teams", () => {
    expect(canonicalTeam("Brand New Team")).toBe("BRAND NEW TEAM");
  });
});
