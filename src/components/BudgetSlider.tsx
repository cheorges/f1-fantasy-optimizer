"use client";

import { formatPrice } from "@/lib/format";
import { BUDGET_MIN, BUDGET_MAX, BUDGET_STEP } from "@/lib/config";

interface BudgetSliderProps {
  value: number;
  onChange: (budget: number) => void;
  disabled: boolean;
  label?: string;
}

export default function BudgetSlider({ value, onChange, disabled, label = "Available Budget" }: BudgetSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="budget-slider" className="text-sm text-zinc-400">
          {label}
        </label>
        <span className="text-lg font-semibold text-zinc-100 tabular-nums">{formatPrice(value)}</span>
      </div>
      <input
        id="budget-slider"
        type="range"
        min={BUDGET_MIN}
        max={BUDGET_MAX}
        step={BUDGET_STEP}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-7 cursor-pointer appearance-none bg-transparent disabled:opacity-50 disabled:cursor-not-allowed
          [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-zinc-800
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:-mt-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-zinc-950
          [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-zinc-800
          [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-600 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-zinc-950"
      />
      <div className="flex justify-between text-xs text-zinc-600 tabular-nums">
        <span>{formatPrice(BUDGET_MIN)}</span>
        <span>{formatPrice(BUDGET_MAX)}</span>
      </div>
    </div>
  );
}
