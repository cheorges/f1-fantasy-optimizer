import type {
  DriverAnalysis,
  ConstructorAnalysis,
  SwapRecommendation,
  ConstructorSwapRecommendation,
} from "./types";

interface SwapCandidate {
  id: string | number;
  lapTime: number | null;
  price: number | null;
  valueScore: number | null;
  label: string;
}

interface SwapDelta {
  timeDelta: number;
  priceDelta: number;
  valueScoreDelta: number;
  reason: string;
}

function buildReason(label: string, timeDelta: number, priceDelta: number): string {
  if (priceDelta <= 0) {
    return `${label} is ${timeDelta.toFixed(3)}s faster and ${Math.abs(priceDelta).toFixed(1)}M cheaper`;
  }
  if (priceDelta <= 0.5) {
    return `${label} is ${timeDelta.toFixed(3)}s faster at similar price (+${priceDelta.toFixed(1)}M)`;
  }
  return `${label} is ${timeDelta.toFixed(3)}s faster for +${priceDelta.toFixed(1)}M`;
}

function compareSwaps(a: SwapDelta, b: SwapDelta): number {
  if (Math.abs(a.timeDelta - b.timeDelta) > 0.01) return b.timeDelta - a.timeDelta;
  return b.valueScoreDelta - a.valueScoreDelta;
}

function buildSwaps<T, R extends SwapDelta>(
  items: T[],
  toCandidate: (item: T) => SwapCandidate,
  budget: number,
  toResult: (out: T, into: T, delta: SwapDelta) => R,
): R[] {
  const withData = items
    .map((item) => ({ item, candidate: toCandidate(item) }))
    .filter(({ candidate }) => candidate.lapTime !== null && candidate.price !== null);

  const results: R[] = [];

  for (const out of withData) {
    for (const into of withData) {
      if (out.candidate.id === into.candidate.id) continue;

      const priceDelta = (into.candidate.price as number) - (out.candidate.price as number);
      if ((into.candidate.lapTime as number) >= (out.candidate.lapTime as number)) continue;
      if (priceDelta > budget) continue;

      const timeDelta = (out.candidate.lapTime as number) - (into.candidate.lapTime as number);
      const valueScoreDelta = (into.candidate.valueScore ?? 0) - (out.candidate.valueScore ?? 0);
      const reason = buildReason(into.candidate.label, timeDelta, priceDelta);

      results.push(toResult(out.item, into.item, { timeDelta, priceDelta, valueScoreDelta, reason }));
    }
  }

  return results.sort(compareSwaps);
}

export function generateRecommendations(
  drivers: DriverAnalysis[],
  budget: number,
): SwapRecommendation[] {
  return buildSwaps(
    drivers,
    (d) => ({
      id: d.driverNumber,
      lapTime: d.bestLapTime,
      price: d.price,
      valueScore: d.valueScore,
      label: d.nameAcronym,
    }),
    budget,
    (driverOut, driverIn, delta) => ({ driverOut, driverIn, ...delta }),
  );
}

export function generateConstructorRecommendations(
  constructors: ConstructorAnalysis[],
  budget: number,
): ConstructorSwapRecommendation[] {
  return buildSwaps(
    constructors,
    (c) => ({
      id: c.name,
      lapTime: c.avgLapTime,
      price: c.price,
      valueScore: c.valueScore,
      label: c.name,
    }),
    budget,
    (constructorOut, constructorIn, delta) => ({ constructorOut, constructorIn, ...delta }),
  );
}
