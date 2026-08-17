"use client";

import { useState, useEffect, useMemo } from "react";
import type { DriverAnalysis, ConstructorAnalysis } from "@/lib/types";
import type { DriversResponse } from "@/lib/api-types";
import { isDriversResponse } from "@/lib/api-types";
import { generateRecommendations, generateConstructorRecommendations } from "@/lib/swaps";
import { getLiveSessionMessage, RETRY_INTERVAL_MS, type StaleState } from "@/lib/live-session";
import { readCache, writeCache } from "@/lib/browser-cache";
import { useAppData } from "@/components/AppShell";
import StaleDataBanner from "@/components/StaleDataBanner";
import SessionSelector from "@/components/SessionSelector";
import DriverTable, { COLUMN_OPTIONS, type DriverColumn } from "@/components/DriverTable";
import BudgetSlider from "@/components/BudgetSlider";
import { BUDGET_MIN } from "@/lib/config";
import RecommendationCard from "@/components/RecommendationCard";
import ConstructorRecommendationCard from "@/components/ConstructorRecommendationCard";
import CollapsibleSection from "@/components/CollapsibleSection";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 10;

export default function Home() {
  const { sessions, loadingSessions, meeting, priceRound, setError, staleSessions } = useAppData();

  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<DriverAnalysis[]>([]);
  const [constructors, setConstructors] = useState<ConstructorAnalysis[]>([]);
  const [budget, setBudget] = useState(BUDGET_MIN);
  const [driverFilter, setDriverFilter] = useState<string | null>(null);
  const [driverPage, setDriverPage] = useState(0);
  const [constructorPage, setConstructorPage] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<DriverColumn>>(new Set());
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [staleDrivers, setStaleDrivers] = useState<StaleState | null>(null);
  const [driversRetry, setDriversRetry] = useState(0);

  // The sessions list can be replaced after the fact — the cache may restore a previous
  // race weekend's list, and the retry then swaps in the current one. Keeping the previous
  // pick only makes sense while it still exists in the new list.
  useEffect(() => {
    if (sessions.length === 0) return;
    setSelectedSession((prev) =>
      prev !== null && sessions.some((s) => s.session_key === prev)
        ? prev
        : sessions[sessions.length - 1]!.session_key,
    );
  }, [sessions]);

  useEffect(() => {
    if (selectedSession === null) return;

    let cancelled = false;

    async function loadDrivers() {
      setLoadingDrivers(true);
      setError(null);

      try {
        const res = await fetch(`/api/drivers?session_key=${selectedSession}`);
        if (cancelled) return;

        const liveMessage = await getLiveSessionMessage(res);
        if (cancelled) return;

        if (liveMessage) {
          // Blocked upstream. Show what this device last saw for this session rather than
          // an empty table — but only for this session: leaving another session's rows on
          // screen would label them with the session the user just picked.
          const cached = readCache<DriversResponse>(`drivers:${selectedSession}`, isDriversResponse);
          setDrivers(cached?.data.drivers ?? []);
          setConstructors(cached?.data.constructors ?? []);
          setStaleDrivers({ savedAt: cached?.savedAt ?? null });
          return;
        }
        if (!res.ok) throw new Error("Failed to load driver data");

        const data: DriversResponse = await res.json();
        if (cancelled) return;

        setDrivers(data.drivers);
        setConstructors(data.constructors);
        writeCache(`drivers:${selectedSession}`, data);
        setStaleDrivers(null);
      } catch (err) {
        if (!cancelled) setError(String(err));
      } finally {
        if (!cancelled) setLoadingDrivers(false);
      }
    }

    loadDrivers();
    return () => { cancelled = true; };
  }, [selectedSession, driversRetry, setError]);

  // Only while blocked, and on a steady cadence — see the same pattern in AppShell.
  const driversBlocked = staleDrivers !== null;
  useEffect(() => {
    if (!driversBlocked) return;
    const id = setInterval(() => setDriversRetry((n) => n + 1), RETRY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [driversBlocked]);

  const recommendations = useMemo(
    () => generateRecommendations(drivers, budget),
    [drivers, budget],
  );
  const constructorRecs = useMemo(
    () => generateConstructorRecommendations(constructors, budget),
    [constructors, budget],
  );

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

  const selectedSessionName = useMemo(
    () => sessions.find((s) => s.session_key === selectedSession)?.session_name ?? null,
    [sessions, selectedSession],
  );

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleToggleColumn(col: DriverColumn) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }

  if (loadingSessions) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
        <span className="ml-3 text-zinc-400">Loading sessions...</span>
      </div>
    );
  }

  const driversCollapsed = collapsedSections.has("drivers");
  const driverRecsCollapsed = collapsedSections.has("driverRecs");

  const columnPicker = (
    <div className="relative">
      <button
        onClick={() => setShowColumnPicker((v) => !v)}
        className="min-h-[44px] px-3 rounded-lg text-xs bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors"
      >
        Columns
      </button>
      {showColumnPicker && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowColumnPicker(false)} />
          <div className="absolute right-0 top-full mt-1 z-30 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[160px]">
            {COLUMN_OPTIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleToggleColumn(key)}
                className="w-full min-h-[44px] px-3 text-left text-xs flex items-center gap-2 hover:bg-zinc-700 transition-colors"
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
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
  );

  const driverFilterSelect = recommendations.length > 0 ? (
    <select
      value={driverFilter ?? ""}
      onChange={(e) => handleDriverFilterChange(e.target.value)}
      className="min-h-[44px] bg-zinc-800 text-zinc-200 text-xs rounded-lg px-2 border border-zinc-700 focus:border-red-500 focus:outline-none"
    >
      <option value="">All Drivers</option>
      {driverOutOptions.map((acronym) => (
        <option key={acronym} value={acronym}>{acronym}</option>
      ))}
    </select>
  ) : undefined;

  return (
    <>
      {/* One banner, even when both fetches are blocked. The driver timestamp wins because
          the table is what the reader is looking at; the session list only matters when the
          drivers fetch never got far enough to have its own. */}
      {(staleDrivers || staleSessions) && (
        <StaleDataBanner savedAt={staleDrivers?.savedAt ?? staleSessions?.savedAt ?? null} />
      )}

      {/* Which practice data the ranking is based on, and from where */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-3 sm:px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-zinc-200">Training Performance</span>
              {priceRound > 0 && (
                <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">Round {priceRound}</span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {meeting
                ? `${meeting.meeting_name} · ${meeting.circuit_short_name}, ${meeting.country_name}`
                : "No race weekend loaded"}
              {selectedSessionName && ` — ${selectedSessionName}`}
            </p>
          </div>
        </div>
        <SessionSelector
          sessions={sessions}
          selectedKey={selectedSession}
          onSelect={handleSessionSelect}
          loading={loadingDrivers}
        />
      </div>

      {/* Driver Table */}
      <CollapsibleSection
        title="Driver Performance & Value"
        info="Lap times and sector data come from the OpenF1 API, based on the selected practice session (FP1/FP2/FP3). Prices and value scores come from the official F1 Fantasy game. The value score combines pace and price — higher means more performance per dollar."
        collapsed={driversCollapsed}
        onToggle={() => toggleSection("drivers")}
        headerRight={driversCollapsed ? undefined : columnPicker}
      >
        <DriverTable
          drivers={drivers}
          loading={loadingDrivers}
          visibleColumns={visibleColumns}
        />
      </CollapsibleSection>

      {/* Shared Budget Slider */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <BudgetSlider value={budget} onChange={handleBudgetChange} disabled={loadingDrivers} />
      </div>

      {/* Driver Recommendations */}
      <CollapsibleSection
        title="Driver Swap Recommendations"
        info="Each recommendation shows a driver swap that would make your team faster. The driver on the left (red) is the one you'd drop, the driver on the right (green) is the replacement. Only swaps within your available budget are shown. Recommendations are sorted by biggest lap time improvement first."
        collapsed={driverRecsCollapsed}
        onToggle={() => toggleSection("driverRecs")}
        headerRight={driverRecsCollapsed ? undefined : driverFilterSelect}
      >
        <div className="p-3 sm:p-4">
          {loadingDrivers ? (
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
              <Pagination
                page={driverPage}
                totalPages={driverTotalPages}
                total={filteredDriverRecs.length}
                onPrev={() => setDriverPage((p) => Math.max(0, p - 1))}
                onNext={() => setDriverPage((p) => Math.min(driverTotalPages - 1, p + 1))}
              />
            </>
          )}
        </div>
      </CollapsibleSection>

      {/* Constructor Recommendations */}
      <CollapsibleSection
        title="Constructor Swap Recommendations"
        info="Each recommendation shows a constructor swap that would make your team faster. A constructor's performance is based on the average lap time of both drivers in the selected practice session. The constructor on the left (red) is the one you'd drop, the one on the right (green) is the replacement. Only swaps within your available budget are shown."
        collapsed={collapsedSections.has("constructorRecs")}
        onToggle={() => toggleSection("constructorRecs")}
      >
        <div className="p-3 sm:p-4">
          {loadingDrivers ? (
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
              <Pagination
                page={constructorPage}
                totalPages={constructorTotalPages}
                total={constructorRecs.length}
                onPrev={() => setConstructorPage((p) => Math.max(0, p - 1))}
                onNext={() => setConstructorPage((p) => Math.min(constructorTotalPages - 1, p + 1))}
              />
            </>
          )}
        </div>
      </CollapsibleSection>
    </>
  );
}
