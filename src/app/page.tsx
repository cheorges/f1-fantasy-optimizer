"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  Session,
  Meeting,
  DriverAnalysis,
  SwapRecommendation,
  ConstructorSwapRecommendation,
  FantasyDriver,
  FantasyConstructor,
} from "@/lib/types";
import SessionSelector from "@/components/SessionSelector";
import DriverTable from "@/components/DriverTable";
import BudgetInput from "@/components/BudgetInput";
import RecommendationCard from "@/components/RecommendationCard";
import ConstructorRecommendationCard from "@/components/ConstructorRecommendationCard";
import PriceTable from "@/components/PriceTable";
import InfoTooltip from "@/components/InfoTooltip";

type ActiveTab = "performance" | "prices";

interface SessionsResponse {
  meeting: Meeting;
  sessions: Session[];
}

interface DriversResponse {
  drivers: DriverAnalysis[];
}

interface RecommendationsResponse {
  budget: number;
  recommendations: SwapRecommendation[];
  constructorRecommendations: ConstructorSwapRecommendation[];
}

interface PricesResponse {
  drivers: FantasyDriver[];
  constructors: FantasyConstructor[];
  round: number;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("performance");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<DriverAnalysis[]>([]);
  const [recommendations, setRecommendations] = useState<SwapRecommendation[]>([]);
  const [constructorRecs, setConstructorRecs] = useState<ConstructorSwapRecommendation[]>([]);
  const [budget, setBudget] = useState(0);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prices tab state
  const [priceDrivers, setPriceDrivers] = useState<FantasyDriver[]>([]);
  const [priceConstructors, setPriceConstructors] = useState<FantasyConstructor[]>([]);
  const [priceRound, setPriceRound] = useState(0);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [pricesFetched, setPricesFetched] = useState(false);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch("/api/sessions");
        if (!res.ok) throw new Error("Failed to load sessions");
        const data: SessionsResponse = await res.json();
        setMeeting(data.meeting);
        setSessions(data.sessions);

        if (data.sessions.length > 0) {
          const latest = data.sessions[data.sessions.length - 1]!;
          setSelectedSession(latest.session_key);
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setLoadingSessions(false);
      }
    }
    fetchSessions();
  }, []);

  const fetchDrivers = useCallback(async (sessionKey: number) => {
    setLoadingDrivers(true);
    setError(null);
    try {
      const res = await fetch(`/api/drivers?session_key=${sessionKey}`);
      if (!res.ok) throw new Error("Failed to load driver data");
      const data: DriversResponse = await res.json();
      setDrivers(data.drivers);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingDrivers(false);
    }
  }, []);

  const fetchRecommendations = useCallback(async (sessionKey: number, budgetVal: number) => {
    setLoadingRecs(true);
    try {
      const res = await fetch(
        `/api/recommendations?budget=${budgetVal}&session_key=${sessionKey}`,
      );
      if (!res.ok) throw new Error("Failed to load recommendations");
      const data: RecommendationsResponse = await res.json();
      setRecommendations(data.recommendations);
      setConstructorRecs(data.constructorRecommendations);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSession !== null) {
      fetchDrivers(selectedSession);
      fetchRecommendations(selectedSession, budget);
    }
  }, [selectedSession, fetchDrivers, fetchRecommendations, budget]);

  // Lazy fetch prices when tab is first activated
  useEffect(() => {
    if (activeTab !== "prices" || pricesFetched) return;

    async function fetchPrices() {
      setLoadingPrices(true);
      try {
        const res = await fetch("/api/prices");
        if (!res.ok) throw new Error("Failed to load prices");
        const data: PricesResponse = await res.json();
        setPriceDrivers(data.drivers);
        setPriceConstructors(data.constructors);
        setPriceRound(data.round);
        setPricesFetched(true);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoadingPrices(false);
      }
    }
    fetchPrices();
  }, [activeTab, pricesFetched]);

  function handleSessionSelect(sessionKey: number) {
    setSelectedSession(sessionKey);
  }

  function handleBudgetChange(newBudget: number) {
    setBudget(newBudget);
  }

  const isLoading = loadingDrivers || loadingRecs;

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
            {activeTab === "performance" && !loadingSessions && (
              <SessionSelector
                sessions={sessions}
                selectedKey={selectedSession}
                onSelect={handleSessionSelect}
                loading={isLoading}
              />
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex gap-0">
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "performance"
                ? "border-red-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setActiveTab("prices")}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "prices"
                ? "border-red-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Prices
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
        {error && (
          <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300">
            {error}
          </div>
        )}

        {activeTab === "performance" && (
          <>
            {loadingSessions ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
                <span className="ml-3 text-zinc-400">Loading sessions...</span>
              </div>
            ) : (
              <>
                {/* Driver Table */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="font-semibold text-zinc-200">
                      Driver Performance & Value
                    </h2>
                    {drivers.length > 0 && (
                      <span className="text-xs text-zinc-500">
                        {drivers[0]?.sessionName} - {drivers.length} drivers
                      </span>
                    )}
                  </div>
                  <DriverTable drivers={drivers} loading={loadingDrivers} />
                </div>

                {/* Shared Budget Input */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
                  <BudgetInput
                    value={budget}
                    onChange={handleBudgetChange}
                    disabled={isLoading}
                  />
                </div>

                {/* Recommendations */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="font-semibold text-zinc-200">
                      Driver Swap Recommendations
                    </h2>
                    <InfoTooltip text="Each recommendation shows a driver swap that would make your team faster. The driver on the left (red) is the one you'd drop, the driver on the right (green) is the replacement. Only swaps within your available budget are shown. Recommendations are sorted by biggest lap time improvement first." />
                  </div>

                  <div className="p-3 sm:p-4">
                    {loadingRecs ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-600 border-t-transparent" />
                        <span className="ml-3 text-zinc-400 text-sm">Calculating...</span>
                      </div>
                    ) : recommendations.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 text-sm">
                        {drivers.length === 0
                          ? "Select a practice session to see recommendations"
                          : "No swap recommendations for this budget. Try increasing your budget."}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {recommendations.slice(0, 20).map((rec, i) => (
                          <RecommendationCard
                            key={`${rec.driverOut.driverNumber}-${rec.driverIn.driverNumber}`}
                            recommendation={rec}
                            index={i}
                          />
                        ))}
                        {recommendations.length > 20 && (
                          <p className="text-center text-xs text-zinc-600 pt-2">
                            Showing top 20 of {recommendations.length} recommendations
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Constructor Recommendations */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                    <h2 className="font-semibold text-zinc-200">
                      Constructor Swap Recommendations
                    </h2>
                    <InfoTooltip text="Each recommendation shows a constructor swap that would make your team faster. A constructor's performance is based on their fastest driver's lap time in the selected practice session. The constructor on the left (red) is the one you'd drop, the one on the right (green) is the replacement. Only swaps within your available budget are shown." />
                  </div>

                  <div className="p-3 sm:p-4">
                    {loadingRecs ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-600 border-t-transparent" />
                        <span className="ml-3 text-zinc-400 text-sm">Calculating...</span>
                      </div>
                    ) : constructorRecs.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 text-sm">
                        {drivers.length === 0
                          ? "Select a practice session to see recommendations"
                          : "No constructor swap recommendations for this budget."}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {constructorRecs.slice(0, 10).map((rec, i) => (
                          <ConstructorRecommendationCard
                            key={`${rec.constructorOut.name}-${rec.constructorIn.name}`}
                            recommendation={rec}
                            index={i}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
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
    </div>
  );
}
