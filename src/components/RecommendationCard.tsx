"use client";

import { memo } from "react";
import type { SwapRecommendation } from "@/lib/types";
import { formatLapTime } from "@/lib/format";
import { SwapDeltas } from "@/components/ConstructorRecommendationCard";

interface RecommendationCardProps {
  recommendation: SwapRecommendation;
}

// One list row: who for whom on top, where the gain comes from below, the two deltas on
// the right.
function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { driverOut, driverIn, timeDelta, priceDelta } = recommendation;

  return (
    <div className="py-2.5 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">
          <span className="text-red-400">{driverOut.nameAcronym}</span>
          <span className="text-zinc-600 mx-1.5">→</span>
          <span className="text-emerald-400">{driverIn.nameAcronym}</span>
        </div>
        <div className="text-xs text-zinc-500 truncate mt-0.5">
          {driverOut.teamName} → {driverIn.teamName} · {formatLapTime(driverOut.bestLapTime)} → {formatLapTime(driverIn.bestLapTime)}
        </div>
      </div>
      <SwapDeltas timeDelta={timeDelta} priceDelta={priceDelta} />
    </div>
  );
}

export default memo(RecommendationCard);
