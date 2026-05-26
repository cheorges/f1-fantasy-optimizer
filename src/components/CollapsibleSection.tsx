"use client";

import type { ReactNode } from "react";
import InfoTooltip from "@/components/InfoTooltip";

interface CollapsibleSectionProps {
  title: string;
  info?: string;
  collapsed: boolean;
  onToggle: () => void;
  headerRight?: ReactNode;
  children: ReactNode;
}

export default function CollapsibleSection({
  title,
  info,
  collapsed,
  onToggle,
  headerRight,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800">
      <div className="px-3 sm:px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-3">
        <div className="flex items-center flex-1 min-w-0">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            className="flex items-center cursor-pointer select-none text-left"
          >
            <span className="text-zinc-500 mr-2 text-xs">{collapsed ? "▶" : "▼"}</span>
            <h2 className="font-semibold text-zinc-200">{title}</h2>
          </button>
          {info && <InfoTooltip text={info} />}
        </div>
        {headerRight && <div className="shrink-0">{headerRight}</div>}
      </div>
      {!collapsed && children}
    </div>
  );
}
