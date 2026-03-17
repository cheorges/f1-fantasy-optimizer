"use client";

import { useState, useEffect, useMemo } from "react";
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
import DriverTable, { COLUMN_OPTIONS, type DriverColumn } from "@/components/DriverTable";
import BudgetInput from "@/components/BudgetInput";
import RecommendationCard from "@/components/RecommendationCard";
import ConstructorRecommendationCard from "@/components/ConstructorRecommendationCard";
import PriceTable from "@/components/PriceTable";
import TeamTab from "@/components/TeamTab";
import InfoTooltip from "@/components/InfoTooltip";

type ActiveTab = "training" | "team" | "prices";

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
  const [activeTab, setActiveTab] = useState<ActiveTab>("training");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<DriverAnalysis[]>([]);
  const [recommendations, setRecommendations] = useState<SwapRecommendation[]>([]);
  const [constructorRecs, setConstructorRecs] = useState<ConstructorSwapRecommendation[]>([]);
  const [budget, setBudget] = useState(0);
  const [driverFilter, setDriverFilter] = useState<string | null>(null);
  const [driverPage, setDriverPage] = useState(0);
  const [constructorPage, setConstructorPage] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<DriverColumn>>(new Set());
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Prices tab state
  const [priceDrivers, setPriceDrivers] = useState<FantasyDriver[]>([]);
  const [priceConstructors, setPriceConstructors] = useState<FantasyConstructor[]>([]);
  const [priceRound, setPriceRound] = useState(0);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [pricesFetched, setPricesFetched] = useState(false);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  }

  async function isLiveSessionError(res: Response): Promise<boolean> {
    if (res.ok) return false;
    if (res.status !== 503) return false;
    const cloned = res.clone();
    const body = await cloned.json().catch(() => null);
    if (body?.code === "LIVE_SESSION") {
      showToast(body.error);
      return true;
    }
    return false;
  }

  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch("/api/sessions");
        if (await isLiveSessionError(res)) return;
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

  useEffect(() => {
    if (selectedSession === null) return;

    let cancelled = false;

    async function loadData() {
      setLoadingDrivers(true);
      setLoadingRecs(true);
      setError(null);

      try {
        const [driversRes, recsRes] = await Promise.all([
          fetch(`/api/drivers?session_key=${selectedSession}`),
          fetch(`/api/recommendations?budget=${budget}&session_key=${selectedSession}`),
        ]);

        if (cancelled) return;

        if (await isLiveSessionError(driversRes)) return;
        if (await isLiveSessionError(recsRes)) return;
        if (!driversRes.ok) throw new Error("Failed to load driver data");
        if (!recsRes.ok) throw new Error("Failed to load recommendations");

        const driversData: DriversResponse = await driversRes.json();
        const recsData: RecommendationsResponse = await recsRes.json();

        if (cancelled) return;

        setDrivers(driversData.drivers);
        setRecommendations(recsData.recommendations);
        setConstructorRecs(recsData.constructorRecommendations);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) {
          setLoadingDrivers(false);
          setLoadingRecs(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [selectedSession, budget]);

  // Lazy fetch prices when tab is first activated
  useEffect(() => {
    if (pricesFetched) return;

    async function fetchPrices() {
      setLoadingPrices(true);
      try {
        const res = await fetch("/api/prices");
        if (await isLiveSessionError(res)) return;
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

  const PAGE_SIZE = 10;

  const filteredDriverRecs = useMemo(() => {
    if (!driverFilter) return recommendations;
    return recommendations.filter((r) => r.driverOut.nameAcronym === driverFilter);
  }, [recommendations, driverFilter]);

  const driverOutOptions = useMemo(() => {
    const seen = new Set<string>();
    return recommendations
      .map((r) => r.driverOut.nameAcronym)
      .filter((acronym) => {
        if (seen.has(acronym)) return false;
        seen.add(acronym);
        return true;
      })
      .sort();
  }, [recommendations]);

  const driverTotalPages = Math.max(1, Math.ceil(filteredDriverRecs.length / PAGE_SIZE));
  const pagedDriverRecs = filteredDriverRecs.slice(driverPage * PAGE_SIZE, (driverPage + 1) * PAGE_SIZE);

  const constructorTotalPages = Math.max(1, Math.ceil(constructorRecs.length / PAGE_SIZE));
  const pagedConstructorRecs = constructorRecs.slice(constructorPage * PAGE_SIZE, (constructorPage + 1) * PAGE_SIZE);

  function handleSessionSelect(sessionKey: number) {
    setSelectedSession(sessionKey);
    setDriverFilter(null);
    setDriverPage(0);
    setConstructorPage(0);
  }

  function handleBudgetChange(newBudget: number) {
    setBudget(newBudget);
    setDriverPage(0);
    setConstructorPage(0);
  }

  function handleDriverFilterChange(acronym: string) {
    setDriverFilter(acronym || null);
    setDriverPage(0);
  }

  function toggleSection(id: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleToggleColumn(col: DriverColumn) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) {
        next.delete(col);
      } else {
        next.add(col);
      }
      return next;
    });
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
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex gap-0">
          <button
            onClick={() => setActiveTab("training")}
            aria-selected={activeTab === "training"}
            role="tab"
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "training"
                ? "border-red-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Training
          </button>
          <button
            onClick={() => setActiveTab("team")}
            aria-selected={activeTab === "team"}
            role="tab"
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "team"
                ? "border-red-500 text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Team
          </button>
          <button
            onClick={() => setActiveTab("prices")}
            aria-selected={activeTab === "prices"}
            role="tab"
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
          <>
            {loadingSessions ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
                <span className="ml-3 text-zinc-400">Loading sessions...</span>
              </div>
            ) : (
              <>
                {/* Training Header */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-zinc-200">Training Performance</span>
                    {meeting && (
                      <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">Round {priceRound || meeting.meeting_key}</span>
                    )}
                  </div>
                  <SessionSelector
                    sessions={sessions}
                    selectedKey={selectedSession}
                    onSelect={handleSessionSelect}
                    loading={isLoading}
                  />
                </div>

                {/* Driver Table */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-3">
                    <div
                      className="flex items-center cursor-pointer select-none flex-1"
                      onClick={() => toggleSection("drivers")}
                    >
                      <span className="text-zinc-500 mr-2 text-xs">{collapsedSections.has("drivers") ? "\u25B6" : "\u25BC"}</span>
                      <h2 className="font-semibold text-zinc-200">
                        Driver Performance & Value
                      </h2>
                      <InfoTooltip text="Lap times and sector data come from the OpenF1 API, based on the selected practice session (FP1/FP2/FP3). Prices and value scores come from the official F1 Fantasy game. The value score combines pace and price — higher means more performance per dollar." />
                    </div>
                    {!collapsedSections.has("drivers") && (
                      <div className="relative">
                        <button
                          onClick={() => setShowColumnPicker((v) => !v)}
                          className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors"
                        >
                          Columns
                        </button>
                        {showColumnPicker && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setShowColumnPicker(false)}
                            />
                            <div className="absolute right-0 top-full mt-1 z-30 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px]">
                              {COLUMN_OPTIONS.map(({ key, label }) => (
                                <button
                                  key={key}
                                  onClick={() => handleToggleColumn(key)}
                                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-zinc-700 transition-colors"
                                >
                                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                    visibleColumns.has(key) ? "bg-red-600 border-red-600" : "border-zinc-600"
                                  }`}>
                                    {visibleColumns.has(key) && <span className="text-white text-[10px]">&#10003;</span>}
                                  </span>
                                  <span className="text-zinc-200">{label}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {!collapsedSections.has("drivers") && (
                    <DriverTable
                      drivers={drivers}
                      loading={loadingDrivers}
                      visibleColumns={visibleColumns}
                      onToggleColumn={handleToggleColumn}
                    />
                  )}
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
                <div className="bg-zinc-900 rounded-xl border border-zinc-800">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between gap-3">
                    <div
                      className="flex items-center cursor-pointer select-none flex-1"
                      onClick={() => toggleSection("driverRecs")}
                    >
                      <span className="text-zinc-500 mr-2 text-xs">{collapsedSections.has("driverRecs") ? "\u25B6" : "\u25BC"}</span>
                      <h2 className="font-semibold text-zinc-200">
                        Driver Swap Recommendations
                      </h2>
                      <InfoTooltip text="Each recommendation shows a driver swap that would make your team faster. The driver on the left (red) is the one you'd drop, the driver on the right (green) is the replacement. Only swaps within your available budget are shown. Recommendations are sorted by biggest lap time improvement first." />
                    </div>
                    {!collapsedSections.has("driverRecs") && recommendations.length > 0 && (
                      <select
                        value={driverFilter ?? ""}
                        onChange={(e) => handleDriverFilterChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1.5 border border-zinc-700 focus:border-red-500 focus:outline-none"
                      >
                        <option value="">All Drivers</option>
                        {driverOutOptions.map((acronym) => (
                          <option key={acronym} value={acronym}>{acronym}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {!collapsedSections.has("driverRecs") && <div className="p-3 sm:p-4">
                    {loadingRecs ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-600 border-t-transparent" />
                        <span className="ml-3 text-zinc-400 text-sm">Calculating...</span>
                      </div>
                    ) : filteredDriverRecs.length === 0 ? (
                      <div className="text-center py-8 text-zinc-500 text-sm">
                        {drivers.length === 0
                          ? "Select a practice session to see recommendations"
                          : driverFilter
                            ? `No swap recommendations for ${driverFilter} with this budget.`
                            : "No swap recommendations for this budget. Try increasing your budget."}
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-3">
                          {pagedDriverRecs.map((rec, i) => (
                            <RecommendationCard
                              key={`${rec.driverOut.driverNumber}-${rec.driverIn.driverNumber}`}
                              recommendation={rec}
                              index={driverPage * PAGE_SIZE + i}
                            />
                          ))}
                        </div>
                        {driverTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-3 pt-4">
                            <button
                              onClick={() => setDriverPage((p) => Math.max(0, p - 1))}
                              disabled={driverPage === 0}
                              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Prev
                            </button>
                            <span className="text-xs text-zinc-500">
                              {driverPage + 1} / {driverTotalPages} ({filteredDriverRecs.length})
                            </span>
                            <button
                              onClick={() => setDriverPage((p) => Math.min(driverTotalPages - 1, p + 1))}
                              disabled={driverPage >= driverTotalPages - 1}
                              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>}
                </div>

                {/* Constructor Recommendations */}
                <div className="bg-zinc-900 rounded-xl border border-zinc-800">
                  <div
                    className="px-4 py-3 border-b border-zinc-800 cursor-pointer select-none"
                    onClick={() => toggleSection("constructorRecs")}
                  >
                    <div className="flex items-center">
                      <span className="text-zinc-500 mr-2 text-xs">{collapsedSections.has("constructorRecs") ? "\u25B6" : "\u25BC"}</span>
                      <h2 className="font-semibold text-zinc-200">
                        Constructor Swap Recommendations
                      </h2>
                      <InfoTooltip text="Each recommendation shows a constructor swap that would make your team faster. A constructor's performance is based on the average lap time of both drivers in the selected practice session. The constructor on the left (red) is the one you'd drop, the one on the right (green) is the replacement. Only swaps within your available budget are shown." />
                    </div>
                  </div>

                  {!collapsedSections.has("constructorRecs") && <div className="p-3 sm:p-4">
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
                      <>
                        <div className="flex flex-col gap-3">
                          {pagedConstructorRecs.map((rec, i) => (
                            <ConstructorRecommendationCard
                              key={`${rec.constructorOut.name}-${rec.constructorIn.name}`}
                              recommendation={rec}
                              index={constructorPage * PAGE_SIZE + i}
                            />
                          ))}
                        </div>
                        {constructorTotalPages > 1 && (
                          <div className="flex items-center justify-center gap-3 pt-4">
                            <button
                              onClick={() => setConstructorPage((p) => Math.max(0, p - 1))}
                              disabled={constructorPage === 0}
                              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Prev
                            </button>
                            <span className="text-xs text-zinc-500">
                              {constructorPage + 1} / {constructorTotalPages} ({constructorRecs.length})
                            </span>
                            <button
                              onClick={() => setConstructorPage((p) => Math.min(constructorTotalPages - 1, p + 1))}
                              disabled={constructorPage >= constructorTotalPages - 1}
                              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>}
                </div>
              </>
            )}
          </>
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
        v{process.env.APP_VERSION}
      </footer>
    </div>
  );
}
