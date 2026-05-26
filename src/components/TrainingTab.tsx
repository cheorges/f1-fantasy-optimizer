"use client";

import { useState, useEffect, useMemo } from "react";
import type { Session, DriverAnalysis, ConstructorAnalysis } from "@/lib/types";
import { generateRecommendations, generateConstructorRecommendations } from "@/lib/swaps";
import { getLiveSessionMessage } from "@/lib/live-session";
import SessionSelector from "@/components/SessionSelector";
import DriverTable, { COLUMN_OPTIONS, type DriverColumn } from "@/components/DriverTable";
import BudgetInput from "@/components/BudgetInput";
import RecommendationCard from "@/components/RecommendationCard";
import ConstructorRecommendationCard from "@/components/ConstructorRecommendationCard";
import CollapsibleSection from "@/components/CollapsibleSection";
import Pagination from "@/components/Pagination";

interface TrainingTabProps {
  sessions: Session[];
  loadingSessions: boolean;
  priceRound: number;
  onError: (message: string | null) => void;
  onToast: (message: string) => void;
}

interface DriversResponse {
  drivers: DriverAnalysis[];
  constructors: ConstructorAnalysis[];
}

const PAGE_SIZE = 10;

export default function TrainingTab({
  sessions,
  loadingSessions,
  priceRound,
  onError,
  onToast,
}: TrainingTabProps) {
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<DriverAnalysis[]>([]);
  const [constructors, setConstructors] = useState<ConstructorAnalysis[]>([]);
  const [budget, setBudget] = useState(0);
  const [driverFilter, setDriverFilter] = useState<string | null>(null);
  const [driverPage, setDriverPage] = useState(0);
  const [constructorPage, setConstructorPage] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<DriverColumn>>(new Set());
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  useEffect(() => {
    if (sessions.length === 0) return;
    setSelectedSession((prev) => prev ?? sessions[sessions.length - 1]!.session_key);
  }, [sessions]);

  useEffect(() => {
    if (selectedSession === null) return;

    let cancelled = false;

    async function loadDrivers() {
      setLoadingDrivers(true);
      onError(null);

      try {
        const res = await fetch(`/api/drivers?session_key=${selectedSession}`);
        if (cancelled) return;

        const liveMessage = await getLiveSessionMessage(res);
        if (liveMessage) {
          onToast(liveMessage);
          return;
        }
        if (!res.ok) throw new Error("Failed to load driver data");

        const data: DriversResponse = await res.json();
        if (cancelled) return;

        setDrivers(data.drivers);
        setConstructors(data.constructors);
      } catch (err) {
        if (!cancelled) onError(String(err));
      } finally {
        if (!cancelled) setLoadingDrivers(false);
      }
    }

    loadDrivers();
    return () => { cancelled = true; };
  }, [selectedSession, onError, onToast]);

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
        className="px-2.5 py-1.5 rounded-lg text-xs bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors"
      >
        Columns
      </button>
      {showColumnPicker && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowColumnPicker(false)} />
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
  );

  const driverFilterSelect = recommendations.length > 0 ? (
    <select
      value={driverFilter ?? ""}
      onChange={(e) => handleDriverFilterChange(e.target.value)}
      className="bg-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1.5 border border-zinc-700 focus:border-red-500 focus:outline-none"
    >
      <option value="">All Drivers</option>
      {driverOutOptions.map((acronym) => (
        <option key={acronym} value={acronym}>{acronym}</option>
      ))}
    </select>
  ) : undefined;

  return (
    <>
      {/* Training Header */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-zinc-200">Training Performance</span>
          {priceRound > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">Round {priceRound}</span>
          )}
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

      {/* Shared Budget Input */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <BudgetInput value={budget} onChange={handleBudgetChange} disabled={loadingDrivers} />
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
