"use client";

import type { ReactNode } from "react";
import InfoTooltip from "@/components/InfoTooltip";

interface CollapsibleSectionProps {
  title: string;
  info?: string;
  collapsed: boolean;
  onToggle: () => void;
  headerRight?: ReactNode;
  // Shown in place of the body while collapsed.
  collapsedContent?: ReactNode;
  children: ReactNode;
}

// Flat on purpose: a heading over a list, no card around it. Cards in cards cost a border
// and padding on every side at each level, which a 390px screen cannot spare.
export default function CollapsibleSection({
  title,
  info,
  collapsed,
  onToggle,
  headerRight,
  collapsedContent,
  children,
}: CollapsibleSectionProps) {
  return (
    <section>
      <div className="min-h-9 mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center min-w-0">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="tap-target flex items-center gap-1.5 text-left select-none"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              aria-hidden
              className={`shrink-0 text-zinc-500 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            >
              <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 className="text-[15px] font-semibold text-zinc-100">{title}</h2>
          </button>
          {info && <InfoTooltip text={info} />}
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>
      {collapsed ? collapsedContent : children}
    </section>
  );
}
