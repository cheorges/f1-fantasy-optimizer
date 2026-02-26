"use client";

interface BudgetInputProps {
  value: number;
  onChange: (budget: number) => void;
  disabled: boolean;
}

const PRESETS = [0, 1, 2.5, 5, 10];

export default function BudgetInput({ value, onChange, disabled }: BudgetInputProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <label className="text-sm text-zinc-400 whitespace-nowrap">
        Available Budget:
      </label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            min={0}
            step={0.1}
            disabled={disabled}
            className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-red-600 disabled:opacity-50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">M</span>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => onChange(preset)}
              disabled={disabled}
              className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                value === preset
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 active:bg-zinc-600"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {preset === 0 ? "Free" : `${preset}M`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
