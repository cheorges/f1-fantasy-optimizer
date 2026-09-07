"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session, Meeting, FantasyDriver, FantasyConstructor } from "@/lib/types";
import type { SessionsResponse, PricesResponse } from "@/lib/api-types";
import { isSessionsResponse } from "@/lib/api-types";
import { getLiveSessionMessage, RETRY_INTERVAL_MS, type StaleState } from "@/lib/live-session";
import { AppDataContext } from "@/components/app-data";
import { readCache, writeCache } from "@/lib/browser-cache";
import BottomNav from "@/components/BottomNav";

// Lives in the layout, so it stays mounted across route changes — sessions and prices
// are fetched once per page load, not once per navigation.
export default function AppShell({ children }: { children: ReactNode }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staleSessions, setStaleSessions] = useState<StaleState | null>(null);
  // Owned by the home page, published here for the nav.
  const [staleDrivers, setStaleDrivers] = useState<StaleState | null>(null);
  const [sessionsRetry, setSessionsRetry] = useState(0);

  const [priceDrivers, setPriceDrivers] = useState<FantasyDriver[]>([]);
  const [priceConstructors, setPriceConstructors] = useState<FantasyConstructor[]>([]);
  const [priceRound, setPriceRound] = useState(0);
  // Starts true, like loadingSessions: /prices and /teams are directly addressable, so a
  // cold load must show a spinner rather than the "no data" branch until the fetch settles.
  const [loadingPrices, setLoadingPrices] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch("/api/sessions");
        const liveMessage = await getLiveSessionMessage(res);
        if (liveMessage) {
          // Blocked upstream. Fall back to whatever this device saw last, so the home page
          // shows the previous session instead of nothing.
          const cached = readCache<SessionsResponse>("sessions", isSessionsResponse);
          if (cached) {
            setMeeting(cached.data.meeting);
            setSessions(cached.data.sessions);
          }
          setStaleSessions({ savedAt: cached?.savedAt ?? null });
          return;
        }
        if (!res.ok) throw new Error("Failed to load sessions");
        const data: SessionsResponse = await res.json();
        setMeeting(data.meeting);
        setSessions(data.sessions);
        writeCache("sessions", data);
        setStaleSessions(null);
        setError(null);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoadingSessions(false);
      }
    }
    fetchSessions();
  }, [sessionsRetry]);

  // Only while blocked. Guarding on the boolean rather than the object keeps the interval
  // on a steady cadence instead of restarting it after every failed attempt.
  const sessionsBlocked = staleSessions !== null;
  useEffect(() => {
    if (!sessionsBlocked) return;
    const id = setInterval(() => setSessionsRetry((n) => n + 1), RETRY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [sessionsBlocked]);

  // Prices come from the Fantasy feed and the race calendar, never from OpenF1, so a live
  // session cannot block them — no cache fallback needed here.
  useEffect(() => {
    async function fetchPrices() {
      setLoadingPrices(true);
      try {
        const res = await fetch("/api/prices");
        if (!res.ok) throw new Error("Failed to load prices");
        const data: PricesResponse = await res.json();
        setPriceDrivers(data.drivers);
        setPriceConstructors(data.constructors);
        setPriceRound(data.round);
        setError(null);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoadingPrices(false);
      }
    }
    fetchPrices();
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        meeting,
        sessions,
        loadingSessions,
        priceDrivers,
        priceConstructors,
        priceRound,
        loadingPrices,
        setError,
        staleSessions,
        staleDrivers,
        setStaleDrivers,
      }}
    >
      <div className="min-h-screen">
        <header className="border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold truncate">
                <span className="text-red-500">F1</span> Fantasy Optimizer
              </h1>
              {meeting && (
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 truncate">
                  {meeting.meeting_name} - {meeting.country_name}
                </p>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col gap-4 sm:gap-6">
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300">
              <p>{error}</p>
              <p className="mt-2 text-xs text-red-400">This app uses the free tier of the F1 APIs which have rate limits. Please reload the page and try again.</p>
            </div>
          )}

          {/* The banner is rendered by the home page, not here: only practice data is ever
              blocked, and the page knows which of the two cache entries is actually on
              screen, so it can name the right timestamp. */}
          {children}

          <p className="text-center text-xs text-zinc-600">
            v{process.env.APP_VERSION ?? "dev"}
          </p>
        </main>

        <BottomNav />
      </div>
    </AppDataContext.Provider>
  );
}
