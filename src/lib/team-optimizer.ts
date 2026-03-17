import type { FantasyDriver, FantasyConstructor, FantasyTeam, PointsSwapSuggestion } from "./types";

const STORAGE_KEY = "f1-fantasy-team";

export function loadTeam(): FantasyTeam | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.driverIds) && Array.isArray(parsed.constructorIds)) {
      return parsed as FantasyTeam;
    }
    return null;
  } catch {
    return null;
  }
}

export function saveTeam(team: FantasyTeam): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(team));
}

export function getTeamSuggestions(
  selectedDriverIds: number[],
  selectedConstructorIds: number[],
  allDrivers: FantasyDriver[],
  allConstructors: FantasyConstructor[],
  remainingBudget: number,
): PointsSwapSuggestion[] {
  const suggestions: PointsSwapSuggestion[] = [];
  const driverIdSet = new Set(selectedDriverIds);
  const constructorIdSet = new Set(selectedConstructorIds);

  for (const driverId of selectedDriverIds) {
    const current = allDrivers.find((d) => d.id === driverId);
    if (!current) continue;

    for (const candidate of allDrivers) {
      if (driverIdSet.has(candidate.id)) continue;
      if (candidate.overallPoints <= current.overallPoints) continue;
      if (candidate.price - current.price > remainingBudget) continue;

      suggestions.push({
        type: "driver",
        current: {
          id: current.id,
          name: `${current.firstName} ${current.lastName}`,
          teamName: current.teamName,
          price: current.price,
          overallPoints: current.overallPoints,
        },
        upgrade: {
          id: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`,
          teamName: candidate.teamName,
          price: candidate.price,
          overallPoints: candidate.overallPoints,
        },
        pointsDelta: candidate.overallPoints - current.overallPoints,
        priceDelta: candidate.price - current.price,
      });
    }
  }

  for (const constructorId of selectedConstructorIds) {
    const current = allConstructors.find((c) => c.id === constructorId);
    if (!current) continue;

    for (const candidate of allConstructors) {
      if (constructorIdSet.has(candidate.id)) continue;
      if (candidate.overallPoints <= current.overallPoints) continue;
      if (candidate.price - current.price > remainingBudget) continue;

      suggestions.push({
        type: "constructor",
        current: {
          id: current.id,
          name: current.name,
          teamName: current.name,
          price: current.price,
          overallPoints: current.overallPoints,
        },
        upgrade: {
          id: candidate.id,
          name: candidate.name,
          teamName: candidate.name,
          price: candidate.price,
          overallPoints: candidate.overallPoints,
        },
        pointsDelta: candidate.overallPoints - current.overallPoints,
        priceDelta: candidate.price - current.price,
      });
    }
  }

  suggestions.sort((a, b) => b.pointsDelta - a.pointsDelta);
  return suggestions;
}
