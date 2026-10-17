"use client";

import type { ReactNode } from "react";

interface SegmentedControlProps<T extends string | number> {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  // Extra buttons in the same strip, such as "add".
  children?: ReactNode;
}

// The selected segment is neutral, not red: red is kept for the brand, the active tab and
// the slider, so it still means something where it appears.
export default function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className = "",
  children,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`grid grid-flow-col auto-cols-fr gap-0.5 p-[3px] rounded-[10px] bg-zinc-900 ${className}`}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            aria-pressed={active}
            className={`tap-target h-[30px] min-w-0 px-2 rounded-[7px] text-[13px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              active ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {/* Truncated inside, not on the button: overflow on the button would clip its tap area. */}
            <span className="block truncate">{option.label}</span>
          </button>
        );
      })}
      {children}
    </div>
  );
}
