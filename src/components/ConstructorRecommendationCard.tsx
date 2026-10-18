"use client";

import { memo } from "react";
import type { ConstructorSwapRecommendation } from "@/lib/types";
import { formatLapTime } from "@/lib/format";

interface ConstructorRecommendationCardProps {
  recommendation: ConstructorSwapRecommendation;
}

export function SwapDeltas({ timeDelta, priceDelta }: { timeDelta: number; priceDelta: number }) {
  return (
    <div className="shrink-0 text-right font-mono text-[13px] leading-snug tabular-nums">
      <div className="text-emerald-400">-{timeDelta.toFixed(3)}s</div>
      <div className={priceDelta <= 0 ? "text-emerald-400" : "text-yellow-400"}>
        {priceDelta <= 0 ? "" : "+"}{priceDelta.toFixed(1)}M
      </div>
    </div>
  );
}

function ConstructorRecommendationCard({ recommendation }: ConstructorRecommendationCardProps) {
  const { constructorOut, constructorIn, timeDelta, priceDelta } = recommendation;

  return (
    <div className="py-2.5 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">
          <span className="text-red-400">{constructorOut.name}</span>
          <span className="text-zinc-600 mx-1.5">→</span>
          <span className="text-emerald-400">{constructorIn.name}</span>
        </div>
        <div className="text-xs text-zinc-500 truncate mt-0.5">
          {constructorOut.drivers.join(", ")} → {constructorIn.drivers.join(", ")} · avg {formatLapTime(constructorOut.avgLapTime)} → {formatLapTime(constructorIn.avgLapTime)}
        </div>
      </div>
      <SwapDeltas timeDelta={timeDelta} priceDelta={priceDelta} />
    </div>
  );
}

export default memo(ConstructorRecommendationCard);
