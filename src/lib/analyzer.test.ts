import { describe, it, expect } from "vitest";
import { calculateValueScore } from "./analyzer";

describe("calculateValueScore", () => {
  it("returns null when lap time or price is missing", () => {
    expect(calculateValueScore(null, 20)).toBeNull();
    expect(calculateValueScore(90, null)).toBeNull();
  });

  it("returns null for a zero price (avoids divide-by-zero)", () => {
    expect(calculateValueScore(90, 0)).toBeNull();
  });

  it("rates a faster lap at the same price as better value", () => {
    const faster = calculateValueScore(89, 20)!;
    const slower = calculateValueScore(91, 20)!;
    expect(faster).toBeGreaterThan(slower);
  });

  it("rates a cheaper car at the same pace as better value", () => {
    const cheaper = calculateValueScore(90, 18)!;
    const pricier = calculateValueScore(90, 22)!;
    expect(cheaper).toBeGreaterThan(pricier);
  });
});
