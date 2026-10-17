"use client";

import type { CSSProperties } from "react";
import { formatPrice } from "@/lib/format";
import { BUDGET_MIN, BUDGET_MAX, BUDGET_STEP } from "@/lib/config";

interface BudgetSliderProps {
  value: number;
  onChange: (budget: number) => void;
  disabled: boolean;
  label?: string;
  min?: number;
  max?: number;
}

export default function BudgetSlider({
  value,
  onChange,
  disabled,
  label = "Available budget",
  min = BUDGET_MIN,
  max = BUDGET_MAX,
}: BudgetSliderProps) {
  // WebKit has no pseudo-element for the filled part of the track, so it is painted as a
  // gradient that stops at the thumb. Firefox gets ::-moz-range-progress.
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="budget-slider" className="text-[13px] text-zinc-400">
          {label}
        </label>
        <span className="font-mono text-[13px] text-zinc-100 tabular-nums">{formatPrice(value)}</span>
      </div>
      {/* 44px tall for the finger, the track itself is 4px. */}
      <input
        id="budget-slider"
        type="range"
        min={min}
        max={max}
        step={BUDGET_STEP}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        className="block w-full h-11 -mt-1 cursor-pointer appearance-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed
          [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,#dc2626_var(--fill),#27272a_var(--fill))]
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:-mt-[7px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(220,38,38,0.35)]
          [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-zinc-800
          [&::-moz-range-progress]:h-1 [&::-moz-range-progress]:rounded-full [&::-moz-range-progress]:bg-red-600
          [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-[0_0_0_3px_rgba(220,38,38,0.35)]"
      />
    </div>
  );
}
