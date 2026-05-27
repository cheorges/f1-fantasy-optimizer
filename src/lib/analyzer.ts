import { getDriverPerformances, getPracticeSessions, getLatestMeeting } from "./openf1";
import { getDriverPrices, getConstructorPrices } from "./fantasy";
import { canonicalTeam } from "./team-names";
import type {
  DriverAnalysis,
  DriverPerformance,
  FantasyDriver,
  FantasyConstructor,
  ConstructorAnalysis,
} from "./types";

function matchFantasyDriver(
  performance: DriverPerformance,
  priceMap: Map<string, FantasyDriver>,
): FantasyDriver | null {
  return priceMap.get(performance.driver.name_acronym.toUpperCase()) ?? null;
}

function calculateValueScore(lapTime: number | null, price: number | null): number | null {
  if (lapTime === null || price === null || price === 0) return null;

  // Invert lap time so faster = higher score, divide by price in millions
  // Result: higher = better value (faster per unit cost)
  return (1 / lapTime) * 1000 / price;
}

function buildDriverAnalysis(
  performance: DriverPerformance,
  fantasy: FantasyDriver | null,
): DriverAnalysis {
  const bestLapTime = performance.bestLap?.lap_duration ?? null;

  return {
    driverNumber: performance.driver.driver_number,
    firstName: performance.driver.first_name,
    lastName: performance.driver.last_name,
    nameAcronym: performance.driver.name_acronym,
    teamName: performance.driver.team_name,
    teamColour: performance.driver.team_colour,
    headshotUrl: performance.driver.headshot_url,
    bestLapTime,
    bestSectors: performance.bestSectors,
    topSpeed: performance.topSpeed,
    lapCount: performance.lapCount,
    price: fantasy?.price ?? null,
    priceChange: fantasy?.priceChange ?? null,
    selectedPercentage: fantasy?.selectedPercentage ?? null,
    overallPoints: fantasy?.overallPoints ?? null,
    valueScore: calculateValueScore(bestLapTime, fantasy?.price ?? null),
    sessionName: performance.sessionName,
  };
}

export async function analyzeDrivers(sessionKey?: number): Promise<DriverAnalysis[]> {
  let targetSessionKey = sessionKey;

  if (!targetSessionKey) {
    const meeting = await getLatestMeeting();
    if (!meeting) return [];

    const sessions = await getPracticeSessions(meeting.meeting_key);
    // Use the latest practice session available
    const latestSession = sessions[sessions.length - 1];
    if (!latestSession) return [];
    targetSessionKey = latestSession.session_key;
  }

  const [performances, priceMap] = await Promise.all([
    getDriverPerformances(targetSessionKey),
    getDriverPrices(),
  ]);

  return performances
    .map((p) => buildDriverAnalysis(p, matchFantasyDriver(p, priceMap)))
    .sort((a, b) => {
      if (a.bestLapTime === null) return 1;
      if (b.bestLapTime === null) return -1;
      return a.bestLapTime - b.bestLapTime;
    });
}

function matchFantasyConstructor(
  teamName: string,
  priceMap: Map<string, FantasyConstructor>,
): FantasyConstructor | null {
  return priceMap.get(canonicalTeam(teamName)) ?? null;
}

// Expects the output of analyzeDrivers for the same session: constructor lap times are
// derived by grouping those already-analyzed drivers by team.
export async function analyzeConstructors(
  drivers: DriverAnalysis[],
): Promise<ConstructorAnalysis[]> {
  const constructorPrices = await getConstructorPrices();

  // Group drivers by team
  const teamMap = new Map<string, DriverAnalysis[]>();
  for (const driver of drivers) {
    const existing = teamMap.get(driver.teamName) ?? [];
    existing.push(driver);
    teamMap.set(driver.teamName, existing);
  }

  const constructors: ConstructorAnalysis[] = [];

  for (const [teamName, teamDrivers] of teamMap) {
    const validLaps = teamDrivers
      .map((d) => d.bestLapTime)
      .filter((t): t is number => t !== null);

    const bestLapTime = validLaps.length > 0 ? Math.min(...validLaps) : null;
    const avgLapTime = validLaps.length > 0
      ? validLaps.reduce((sum, t) => sum + t, 0) / validLaps.length
      : null;

    const fantasy = matchFantasyConstructor(teamName, constructorPrices);
    const teamColour = teamDrivers[0]?.teamColour ?? "666666";

    constructors.push({
      name: teamName,
      teamColour,
      bestLapTime,
      avgLapTime,
      drivers: teamDrivers.map((d) => d.nameAcronym),
      price: fantasy?.price ?? null,
      priceChange: fantasy?.priceChange ?? null,
      selectedPercentage: fantasy?.selectedPercentage ?? null,
      overallPoints: fantasy?.overallPoints ?? null,
      valueScore: calculateValueScore(avgLapTime, fantasy?.price ?? null),
    });
  }

  return constructors.sort((a, b) => {
    if (a.avgLapTime === null) return 1;
    if (b.avgLapTime === null) return -1;
    return a.avgLapTime - b.avgLapTime;
  });
}

export { calculateValueScore };
