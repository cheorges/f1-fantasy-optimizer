"use client";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}

const CHEVRON = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Quiet by design: paging is navigation, not the point of the list. Disabled reads as a
// faded arrow rather than an empty grey box, which looked broken at the ends of the range.
function Arrow({ direction, disabled, onClick }: { direction: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous page" : "Next page"}
      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-zinc-100 hover:bg-zinc-800 active:bg-zinc-700 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-zinc-400 disabled:cursor-not-allowed"
    >
      <svg {...CHEVRON}>
        <path d={direction === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
      </svg>
    </button>
  );
}

export default function Pagination({ page, totalPages, onPrev, onNext }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Arrow direction="prev" disabled={page === 0} onClick={onPrev} />
      {/* Fixed width so the arrows don't shift when the digits change. */}
      <span className="text-xs text-zinc-500 tabular-nums min-w-[6.5rem] text-center">
        Page {page + 1} of {totalPages}
      </span>
      <Arrow direction="next" disabled={page >= totalPages - 1} onClick={onNext} />
    </div>
  );
}
