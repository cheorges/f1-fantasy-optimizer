"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppData, isSessionRunning } from "@/components/app-data";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Home",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </svg>
    ),
  },
  {
    href: "/teams",
    label: "Teams",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
        <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1" />
        <path d="M18 14.9c2 .8 3 2.6 3 5.1" />
      </svg>
    ),
  },
  {
    href: "/prices",
    label: "Prices",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 3v18" />
        <path d="M16.5 7.5c0-1.9-2-3-4.5-3s-4.5 1.1-4.5 3 2 2.7 4.5 3.3 4.5 1.4 4.5 3.3-2 3-4.5 3-4.5-1.1-4.5-3" />
      </svg>
    ),
  },
];

// Only while a session runs. The signal is one the app already has: OpenF1 blocks its free
// tier for the session's duration. No extra polling, and no dead tab on a Tuesday.
const LIVE_ITEM: NavItem = {
  href: "/live",
  label: "Live",
  icon: (
    <svg {...ICON_PROPS}>
      <path d="M12 12h.01" />
      <path d="M8.5 15.5a5 5 0 0 1 0-7" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M5.5 18.5a9 9 0 0 1 0-13" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  ),
};

export default function BottomNav() {
  const pathname = usePathname();
  const appData = useAppData();

  // Keep it while the reader stands on it, so a session ending under them leaves the nav
  // with something marked.
  const showLive = isSessionRunning(appData) || pathname === "/live";
  const items = showLive ? [...NAV_ITEMS, LIVE_ITEM] : NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-7xl mx-auto flex">
        {items.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex-1 min-h-[56px] flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:bg-zinc-800/70 ${
                active ? "text-red-500" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {icon}
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
