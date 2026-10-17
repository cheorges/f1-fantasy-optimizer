"use client";

interface SortButtonProps {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  className?: string;
}

// A column heading that sorts. Replaces the row of sort chips above each list.
export default function SortButton({ label, active, direction, onClick, className = "" }: SortButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Sort by ${label}`}
      aria-pressed={active}
      className={`tap-target text-xs whitespace-nowrap transition-colors ${
        active ? "text-zinc-100 font-medium" : "text-zinc-500 hover:text-zinc-300"
      } ${className}`}
    >
      {label}
      {active && (direction === "asc" ? " ↑" : " ↓")}
    </button>
  );
}
