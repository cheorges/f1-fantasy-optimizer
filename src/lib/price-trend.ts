import { fetchRound, PAST_ROUND_TTL_MS } from "./fantasy";
import type { PriceTrend } from "./types";

// How many rounds back the comparison reaches. One round is too noisy: the feed reports
// ownership as a whole percent, so week-to-week moves often round away to zero.
const WINDOW = 3;

/**
 * The feed exposes no transfer numbers, and net transfers are what actually move prices
 * in the game. All we have are two proxies: where the price has been going, and where
 * ownership has been going.
 *
 * The rule is that neither may contradict the other. One signal standing still does not
 * veto the one that moved — ownership is published as a whole percent, so a zero delta
 * usually means "too small to see", not "held steady". Only a genuine disagreement, or
 * both standing still, reads as "flat": claiming a direction the signals argue about
 * would be worse than saying nothing.
 */
export function classify(priceDelta: number, ownershipDelta: number): PriceTrend {
  if (priceDelta >= 0 && ownershipDelta >= 0 && (priceDelta > 0 || ownershipDelta > 0)) return "up";
  if (priceDelta <= 0 && ownershipDelta <= 0 && (priceDelta < 0 || ownershipDelta < 0)) return "down";
  return "flat";
}

interface Snapshot {
  price: number;
  selectedPercentage: number;
}

function indexRound(data: { drivers: { id: number; price: number; selectedPercentage: number }[]; constructors: { id: number; price: number; selectedPercentage: number }[] }): Map<number, Snapshot> {
  const index = new Map<number, Snapshot>();
  for (const player of [...data.drivers, ...data.constructors]) {
    index.set(player.id, { price: player.price, selectedPercentage: player.selectedPercentage });
  }
  return index;
}

/**
 * Builds a trend per player id by comparing the current round against the oldest round
 * still inside the window. Returns an empty map when there is no earlier round to compare
 * against (start of season) — callers render that as "no trend", not as "flat".
 */
export async function getPriceTrends(currentRound: number): Promise<Map<number, PriceTrend>> {
  const oldestRound = currentRound - (WINDOW - 1);
  if (oldestRound < 1) return new Map();

  const [current, oldest] = await Promise.all([
    fetchRound(currentRound),
    fetchRound(oldestRound, PAST_ROUND_TTL_MS),
  ]);

  const currentIndex = indexRound(current);
  const oldestIndex = indexRound(oldest);

  const trends = new Map<number, PriceTrend>();
  for (const [id, now] of currentIndex) {
    const then = oldestIndex.get(id);
    if (!then) continue;
    trends.set(id, classify(now.price - then.price, now.selectedPercentage - then.selectedPercentage));
  }

  return trends;
}
