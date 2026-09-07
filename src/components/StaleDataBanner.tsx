"use client";

import Link from "next/link";
import { formatCachedAt } from "@/lib/format";

interface StaleDataBannerProps {
  // When the data on screen was fetched. null means nothing was ever cached.
  savedAt: number | null;
}

// Stays until fresh data arrives, unlike the toast it replaces — a notice that disappears
// after five seconds leaves the page unexplained for everyone who looks a moment later.
export default function StaleDataBanner({ savedAt }: StaleDataBannerProps) {
  return (
    <div
      role="status"
      className="bg-amber-900/30 border border-amber-700/60 rounded-lg px-4 py-3 text-amber-200 text-sm animate-fade-in"
    >
      <p className="font-medium">A session is running</p>
      <p className="mt-1 text-amber-200/80">
        {savedAt === null
          ? "OpenF1's free tier blocks practice data while a session is live, and nothing has been loaded on this device yet."
          : `OpenF1's free tier blocks practice data while a session is live. Showing the last data from ${formatCachedAt(savedAt)}.`}{" "}
        Retrying every 5 minutes. Prices and Teams are unaffected.
      </p>
      <Link
        href="/live"
        className="inline-block mt-2.5 text-sm font-medium text-amber-100 underline decoration-amber-400/50 underline-offset-4 min-h-[44px] leading-[44px] sm:min-h-0 sm:leading-normal"
      >
        See the live timings
      </Link>
    </div>
  );
}
