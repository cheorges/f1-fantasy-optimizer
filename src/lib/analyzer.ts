import { getDriverPerformances, getPracticeSessions, getLatestMeeting } from "./openf1";
import { getDriverPrices } from "./fantasy";
import type { DriverAnalysis, DriverPerformance, FantasyDriver, SwapRecommendation } from "./types";

function matchFantasyDriver(
  performance: DriverPerformance,
  priceMap: Map<string, FantasyDriver>,
): FantasyDriver | null {
  // Match by last name (uppercase)
  const byLastName = priceMap.get(performance.driver.last_name.toUpperCase());
  if (byLastName) return byLastName;

  // Fallback: match by acronym/TLA in fantasy driver names
  for (const [, fd] of priceMap) {
    if (fd.lastName.toUpperCase() === performance.driver.last_name.toUpperCase()) {
      return fd;
    }
  }

  return null;
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

export function generateRecommendations(
  drivers: DriverAnalysis[],
  budget: number,
): SwapRecommendation[] {
  const driversWithData = drivers.filter(
    (d) => d.bestLapTime !== null && d.price !== null,
  );

  const recommendations: SwapRecommendation[] = [];

  for (const driverOut of driversWithData) {
    for (const driverIn of driversWithData) {
      if (driverOut.driverNumber === driverIn.driverNumber) continue;

      const priceDelta = driverIn.price! - driverOut.price!;

      // driverIn must be faster (lower lap time)
      if (driverIn.bestLapTime! >= driverOut.bestLapTime!) continue;

      // Price difference must be within budget
      // Positive priceDelta = driverIn is more expensive, needs budget
      // Negative priceDelta = driverIn is cheaper, always possible
      if (priceDelta > budget) continue;

      const timeDelta = driverOut.bestLapTime! - driverIn.bestLapTime!;
      const valueScoreDelta = (driverIn.valueScore ?? 0) - (driverOut.valueScore ?? 0);

      let reason: string;
      if (priceDelta <= 0) {
        reason = `${driverIn.nameAcronym} is ${timeDelta.toFixed(3)}s faster and ${Math.abs(priceDelta).toFixed(1)}M cheaper`;
      } else if (priceDelta <= 0.5) {
        reason = `${driverIn.nameAcronym} is ${timeDelta.toFixed(3)}s faster at similar price (+${priceDelta.toFixed(1)}M)`;
      } else {
        reason = `${driverIn.nameAcronym} is ${timeDelta.toFixed(3)}s faster for +${priceDelta.toFixed(1)}M`;
      }

      recommendations.push({
        driverOut,
        driverIn,
        timeDelta,
        priceDelta,
        valueScoreDelta,
        reason,
      });
    }
  }

  // Sort: best time improvement first, then best value improvement
  return recommendations.sort((a, b) => {
    if (Math.abs(a.timeDelta - b.timeDelta) > 0.01) return b.timeDelta - a.timeDelta;
    return b.valueScoreDelta - a.valueScoreDelta;
  });
}
