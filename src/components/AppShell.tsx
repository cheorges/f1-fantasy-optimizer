"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Session, Meeting, FantasyDriver, FantasyConstructor } from "@/lib/types";
import type { SessionsResponse, PricesResponse } from "@/lib/api-types";
import { getLiveSessionMessage } from "@/lib/live-session";
import BottomNav from "@/components/BottomNav";

interface AppData {
  meeting: Meeting | null;
  sessions: Session[];
  loadingSessions: boolean;
  priceDrivers: FantasyDriver[];
  priceConstructors: FantasyConstructor[];
  priceRound: number;
  loadingPrices: boolean;
  setError: (message: string | null) => void;
  showToast: (message: string) => void;
}

const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const context = useContext(AppDataContext);
  if (!context) throw new Error("useAppData must be used inside AppShell");
  return context;
}

// Lives in the layout, so it stays mounted across route changes — sessions and prices
// are fetched once per page load, not once per navigation.
export default function AppShell({ children }: { children: ReactNode }) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [priceDrivers, setPriceDrivers] = useState<FantasyDriver[]>([]);
  const [priceConstructors, setPriceConstructors] = useState<FantasyConstructor[]>([]);
  const [priceRound, setPriceRound] = useState(0);
  // Starts true, like loadingSessions: /prices and /teams are directly addressable, so a
  // cold load must show a spinner rather than the "no data" branch until the fetch settles.
  const [loadingPrices, setLoadingPrices] = useState(true);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch("/api/sessions");
        const liveMessage = await getLiveSessionMessage(res);
        if (liveMessage) {
          showToast(liveMessage);
          return;
        }
        if (!res.ok) throw new Error("Failed to load sessions");
        const data: SessionsResponse = await res.json();
        setMeeting(data.meeting);
        setSessions(data.sessions);
        setError(null);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoadingSessions(false);
      }
    }
    fetchSessions();
  }, [showToast]);

  useEffect(() => {
    async function fetchPrices() {
      setLoadingPrices(true);
      try {
        const res = await fetch("/api/prices");
        const liveMessage = await getLiveSessionMessage(res);
        if (liveMessage) {
          showToast(liveMessage);
          return;
        }
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
  }, [showToast]);

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
        showToast,
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

        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-2rem)] bg-amber-900/90 border border-amber-700 rounded-lg px-4 py-3 text-amber-200 text-sm shadow-lg animate-fade-in">
            {toast}
          </div>
        )}

        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-[calc(5rem+env(safe-area-inset-bottom))] flex flex-col gap-4 sm:gap-6">
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300">
              <p>{error}</p>
              <p className="mt-2 text-xs text-red-400">This app uses the free tier of the F1 APIs which have rate limits. Please reload the page and try again.</p>
            </div>
          )}

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
