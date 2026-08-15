import type { FantasyDriver, FantasyConstructor, FantasyTeam, TeamStore, PointsSwapSuggestion } from "./types";
import { BUDGET_MIN } from "./config";

const STORAGE_KEY = "f1-fantasy-team";

export const MAX_TEAMS = 3;

export function makeTeam(index: number): FantasyTeam {
  return {
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    driverIds: [],
    constructorIds: [],
    budget: BUDGET_MIN,
  };
}

function emptyStore(): TeamStore {
  const first = makeTeam(0);
  return { version: 2, teams: [first], activeId: first.id };
}

function isSlotArray(value: unknown): value is (number | null)[] {
  return Array.isArray(value) && value.every((v) => typeof v === "number" || v === null);
}

function parseTeam(raw: unknown, index: number): FantasyTeam | null {
  if (typeof raw !== "object" || raw === null) return null;
  const t = raw as Record<string, unknown>;
  if (!isSlotArray(t.driverIds) || !isSlotArray(t.constructorIds)) return null;

  const fallback = makeTeam(index);
  return {
    id: typeof t.id === "string" && t.id ? t.id : fallback.id,
    name: typeof t.name === "string" && t.name ? t.name : fallback.name,
    driverIds: t.driverIds,
    constructorIds: t.constructorIds,
    budget: typeof t.budget === "number" && Number.isFinite(t.budget) ? t.budget : fallback.budget,
  };
}

// Reads both the v2 store and the pre-v2 shape (a bare {driverIds, constructorIds}),
// so an existing single team survives the upgrade instead of being silently dropped.
export function loadTeams(): TeamStore {
  if (typeof window === "undefined") return emptyStore();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return emptyStore();
    const store = parsed as Record<string, unknown>;

    if (Array.isArray(store.teams)) {
      const teams = store.teams
        .map((team, i) => parseTeam(team, i))
        .filter((team): team is FantasyTeam => team !== null)
        .slice(0, MAX_TEAMS);
      if (teams.length === 0) return emptyStore();

      const activeId = typeof store.activeId === "string" && teams.some((t) => t.id === store.activeId)
        ? store.activeId
        : teams[0]!.id;
      return { version: 2, teams, activeId };
    }

    const legacy = parseTeam(store, 0);
    if (legacy) return { version: 2, teams: [legacy], activeId: legacy.id };

    return emptyStore();
  } catch {
    return emptyStore();
  }
}

export function saveTeams(store: TeamStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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
