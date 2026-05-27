"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Session, Meeting, FantasyDriver, FantasyConstructor } from "@/lib/types";
import type { SessionsResponse, PricesResponse } from "@/lib/api-types";
import { getLiveSessionMessage } from "@/lib/live-session";
import TrainingTab from "@/components/TrainingTab";
import PriceTable from "@/components/PriceTable";
import TeamTab from "@/components/TeamTab";

type ActiveTab = "training" | "team" | "prices";

const TABS: { id: ActiveTab; label: string }[] = [
  { id: "training", label: "Training" },
  { id: "team", label: "Team" },
  { id: "prices", label: "Prices" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("training");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [priceDrivers, setPriceDrivers] = useState<FantasyDriver[]>([]);
  const [priceConstructors, setPriceConstructors] = useState<FantasyConstructor[]>([]);
  const [priceRound, setPriceRound] = useState(0);
  const [loadingPrices, setLoadingPrices] = useState(false);

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
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
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
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex gap-0">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-selected={activeTab === id}
              role="tab"
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? "border-red-500 text-white"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-900/90 border border-amber-700 rounded-lg px-4 py-3 text-amber-200 text-sm shadow-lg animate-fade-in">
          {toast}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300">
            <p>{error}</p>
            <p className="mt-2 text-xs text-red-400">This app uses the free tier of the F1 APIs which have rate limits. Please reload the page and try again.</p>
          </div>
        )}

        {activeTab === "training" && (
          <TrainingTab
            sessions={sessions}
            loadingSessions={loadingSessions}
            priceRound={priceRound}
            onError={setError}
            onToast={showToast}
          />
        )}

        {activeTab === "team" && (
          <TeamTab
            drivers={priceDrivers}
            constructors={priceConstructors}
            round={priceRound}
            loading={loadingPrices}
          />
        )}

        {activeTab === "prices" && (
          <PriceTable
            drivers={priceDrivers}
            constructors={priceConstructors}
            round={priceRound}
            loading={loadingPrices}
          />
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-3 sm:px-4 py-4 text-center text-xs text-zinc-600">
        v{process.env.APP_VERSION ?? "dev"}
      </footer>
    </div>
  );
}
