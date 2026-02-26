"use client";

import type { ConstructorSwapRecommendation } from "@/lib/types";

interface ConstructorRecommendationCardProps {
  recommendation: ConstructorSwapRecommendation;
  index: number;
}

export default function ConstructorRecommendationCard({
  recommendation,
  index,
}: ConstructorRecommendationCardProps) {
  const { constructorOut, constructorIn, timeDelta, priceDelta } = recommendation;

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 hover:border-zinc-600 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-zinc-600 text-sm font-mono w-6 shrink-0">
            #{index + 1}
          </span>

          {/* Constructor Out */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-1 h-8 rounded-full shrink-0"
              style={{ backgroundColor: `#${constructorOut.teamColour}` }}
            />
            <div className="min-w-0">
              <div className="font-medium text-red-400 truncate">
                {constructorOut.name}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {constructorOut.drivers.join(", ")}
              </div>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-zinc-500 shrink-0 px-1">&rarr;</div>

          {/* Constructor In */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-1 h-8 rounded-full shrink-0"
              style={{ backgroundColor: `#${constructorIn.teamColour}` }}
            />
            <div className="min-w-0">
              <div className="font-medium text-emerald-400 truncate">
                {constructorIn.name}
              </div>
              <div className="text-xs text-zinc-500 truncate">
                {constructorIn.drivers.join(", ")}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 shrink-0 text-right">
          <div>
            <div className="text-xs text-zinc-500">Time</div>
            <div className="text-sm font-mono text-emerald-400">
              -{timeDelta.toFixed(3)}s
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Cost</div>
            <div className={`text-sm font-mono ${priceDelta <= 0 ? "text-emerald-400" : "text-yellow-400"}`}>
              {priceDelta <= 0 ? "" : "+"}{priceDelta.toFixed(1)}M
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
