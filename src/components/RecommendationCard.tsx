"use client";

import type { SwapRecommendation } from "@/lib/types";

interface RecommendationCardProps {
  recommendation: SwapRecommendation;
  index: number;
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

export default function RecommendationCard({ recommendation, index }: RecommendationCardProps) {
  const { driverOut, driverIn, timeDelta, priceDelta } = recommendation;

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 hover:border-zinc-600 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-zinc-600 text-sm font-mono w-6 shrink-0">
            #{index + 1}
          </span>

          {/* Driver Out */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-1 h-8 rounded-full shrink-0"
              style={{ backgroundColor: `#${driverOut.teamColour}` }}
            />
            <div className="min-w-0">
              <div className="font-medium text-red-400 truncate">
                {driverOut.nameAcronym}
              </div>
              <div className="text-xs text-zinc-500 truncate">{driverOut.teamName}</div>
            </div>
          </div>

          {/* Arrow */}
          <div className="text-zinc-500 shrink-0 px-1">→</div>

          {/* Driver In */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-1 h-8 rounded-full shrink-0"
              style={{ backgroundColor: `#${driverIn.teamColour}` }}
            />
            <div className="min-w-0">
              <div className="font-medium text-emerald-400 truncate">
                {driverIn.nameAcronym}
              </div>
              <div className="text-xs text-zinc-500 truncate">{driverIn.teamName}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 shrink-0 text-right">
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

      {/* Lap comparison */}
      <div className="mt-3 flex gap-6 text-xs text-zinc-500">
        <span>
          {driverOut.nameAcronym}: {formatTime(driverOut.bestLapTime)} / ${driverOut.price?.toFixed(1)}M
        </span>
        <span>
          {driverIn.nameAcronym}: {formatTime(driverIn.bestLapTime)} / ${driverIn.price?.toFixed(1)}M
        </span>
      </div>
    </div>
  );
}
