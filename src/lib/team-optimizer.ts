import type {
  FantasyDriver,
  FantasyConstructor,
  FantasyTeam,
  TeamStore,
  PointsSwapSuggestion,
  SwapRecommendation,
  ConstructorSwapRecommendation,
} from "./types";
import { canonicalTeam } from "./team-names";

const STORAGE_KEY = "f1-fantasy-team";

export const MAX_TEAMS = 3;

export function makeTeam(index: number): FantasyTeam {
  return {
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    driverIds: [],
    constructorIds: [],
    budgetCorrection: 0,
  };
}

function emptyStore(): TeamStore {
  const first = makeTeam(0);
  return { version: 3, teams: [first], activeId: first.id };
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
    // A v2 store carries `budget`, which was a remaining budget — a different quantity,
    // not convertible into a correction. It is dropped rather than misread; the user
    // re-enters it once and it then stays valid across swaps, which the old one did not.
    budgetCorrection:
      typeof t.budgetCorrection === "number" && Number.isFinite(t.budgetCorrection)
        ? t.budgetCorrection
        : fallback.budgetCorrection,
  };
}

// Reads the v3 store, the v2 store, and the original bare {driverIds, constructorIds},
// so an existing line-up survives every upgrade instead of being silently dropped.
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
      return { version: 3, teams, activeId };
    }

    const legacy = parseTeam(store, 0);
    if (legacy) return { version: 3, teams: [legacy], activeId: legacy.id };

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
        qualifiedBy: "points",
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
        qualifiedBy: "points",
      });
    }
  }

  suggestions.sort((a, b) => b.pointsDelta - a.pointsDelta);
  return suggestions;
}

/**
 * Folds practice-based swaps into the points-based list.
 *
 * The two qualify on different grounds — more season points, or a quicker lap this
 * weekend — and those are not comparable quantities. Rather than invent an exchange rate
 * between them, every entry carries the reason it is listed, and the order is: points
 * upgrades first by points gained, then the pace-only ones by time gained. An entry that
 * qualifies both ways is merged, not duplicated.
 */
export function mergePracticeSwaps(
  pointsSuggestions: PointsSwapSuggestion[],
  driverSwaps: SwapRecommendation[],
  constructorSwaps: ConstructorSwapRecommendation[],
  allDrivers: FantasyDriver[],
  allConstructors: FantasyConstructor[],
): PointsSwapSuggestion[] {
  const byTla = new Map(allDrivers.map((d) => [d.tla.toUpperCase(), d]));
  const byTeam = new Map(allConstructors.map((c) => [canonicalTeam(c.name), c]));

  const merged = new Map<string, PointsSwapSuggestion>();
  const key = (s: PointsSwapSuggestion) => `${s.type}:${s.current.id}:${s.upgrade.id}`;
  for (const s of pointsSuggestions) merged.set(key(s), s);

  function add(
    type: "driver" | "constructor",
    from: FantasyDriver | FantasyConstructor | undefined,
    to: FantasyDriver | FantasyConstructor | undefined,
    label: (p: FantasyDriver | FantasyConstructor) => string,
    teamOf: (p: FantasyDriver | FantasyConstructor) => string,
    timeDelta: number,
  ) {
    // A driver with no Fantasy entry cannot be swapped in the game, so there is nothing
    // to suggest — skipping is the only correct move.
    if (!from || !to) return;

    const candidate: PointsSwapSuggestion = {
      type,
      current: { id: from.id, name: label(from), teamName: teamOf(from), price: from.price, overallPoints: from.overallPoints },
      upgrade: { id: to.id, name: label(to), teamName: teamOf(to), price: to.price, overallPoints: to.overallPoints },
      pointsDelta: to.overallPoints - from.overallPoints,
      priceDelta: to.price - from.price,
      timeDelta,
      qualifiedBy: "pace",
    };

    const existing = merged.get(key(candidate));
    if (existing) {
      merged.set(key(candidate), { ...existing, timeDelta, qualifiedBy: "both" });
    } else {
      merged.set(key(candidate), candidate);
    }
  }

  const driverName = (p: FantasyDriver | FantasyConstructor) =>
    "firstName" in p ? `${p.firstName} ${p.lastName}` : p.name;

  for (const swap of driverSwaps) {
    add(
      "driver",
      byTla.get(swap.driverOut.nameAcronym.toUpperCase()),
      byTla.get(swap.driverIn.nameAcronym.toUpperCase()),
      driverName,
      (p) => ("teamName" in p ? p.teamName : p.name),
      swap.timeDelta,
    );
  }

  for (const swap of constructorSwaps) {
    add(
      "constructor",
      byTeam.get(canonicalTeam(swap.constructorOut.name)),
      byTeam.get(canonicalTeam(swap.constructorIn.name)),
      driverName,
      driverName,
      swap.timeDelta,
    );
  }

  return [...merged.values()].sort((a, b) => {
    const aPoints = a.qualifiedBy !== "pace";
    const bPoints = b.qualifiedBy !== "pace";
    if (aPoints !== bPoints) return aPoints ? -1 : 1;
    if (aPoints) return b.pointsDelta - a.pointsDelta;
    return (b.timeDelta ?? 0) - (a.timeDelta ?? 0);
  });
}
