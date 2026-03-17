"use client";

import { useState, useEffect, useMemo } from "react";
import type { FantasyDriver, FantasyConstructor, PointsSwapSuggestion } from "@/lib/types";
import { loadTeam, saveTeam, getTeamSuggestions } from "@/lib/team-optimizer";
import InfoTooltip from "@/components/InfoTooltip";

interface TeamTabProps {
  drivers: FantasyDriver[];
  constructors: FantasyConstructor[];
  round: number;
  loading: boolean;
}

const DRIVER_SLOTS = 5;
const CONSTRUCTOR_SLOTS = 2;
const BUDGET_CAP = 100;
const PAGE_SIZE = 10;

function formatPrice(price: number): string {
  return `$${price.toFixed(1)}M`;
}

export default function TeamTab({ drivers, constructors, round, loading }: TeamTabProps) {
  const [driverIds, setDriverIds] = useState<(number | null)[]>(Array(DRIVER_SLOTS).fill(null));
  const [constructorIds, setConstructorIds] = useState<(number | null)[]>(Array(CONSTRUCTOR_SLOTS).fill(null));
  const [remainingBudget, setRemainingBudget] = useState(0);
  const [teamCollapsed, setTeamCollapsed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [suggestionPage, setSuggestionPage] = useState(0);

  // Load team from localStorage on mount
  useEffect(() => {
    const saved = loadTeam();
    if (!saved) return;

    const validDriverIds = saved.driverIds.filter((id) => drivers.some((d) => d.id === id));
    const validConstructorIds = saved.constructorIds.filter((id) => constructors.some((c) => c.id === id));

    const paddedDrivers: (number | null)[] = [...validDriverIds];
    while (paddedDrivers.length < DRIVER_SLOTS) paddedDrivers.push(null);

    const paddedConstructors: (number | null)[] = [...validConstructorIds];
    while (paddedConstructors.length < CONSTRUCTOR_SLOTS) paddedConstructors.push(null);

    setDriverIds(paddedDrivers.slice(0, DRIVER_SLOTS));
    setConstructorIds(paddedConstructors.slice(0, CONSTRUCTOR_SLOTS));
  }, [drivers, constructors]);

  // Save team to localStorage on change
  useEffect(() => {
    const validDriverIds = driverIds.filter((id): id is number => id !== null);
    const validConstructorIds = constructorIds.filter((id): id is number => id !== null);
    if (validDriverIds.length === 0 && validConstructorIds.length === 0) return;
    saveTeam({ driverIds: validDriverIds, constructorIds: validConstructorIds });
  }, [driverIds, constructorIds]);

  const sortedDrivers = useMemo(
    () => [...drivers].sort((a, b) => a.lastName.localeCompare(b.lastName)),
    [drivers],
  );

  const sortedConstructors = useMemo(
    () => [...constructors].sort((a, b) => a.name.localeCompare(b.name)),
    [constructors],
  );

  const teamCost = useMemo(() => {
    let cost = 0;
    for (const id of driverIds) {
      if (id === null) continue;
      const d = drivers.find((d) => d.id === id);
      if (d) cost += d.price;
    }
    for (const id of constructorIds) {
      if (id === null) continue;
      const c = constructors.find((c) => c.id === id);
      if (c) cost += c.price;
    }
    return cost;
  }, [driverIds, constructorIds, drivers, constructors]);

  const selectedDriverIdSet = useMemo(() => new Set(driverIds.filter((id): id is number => id !== null)), [driverIds]);
  const selectedConstructorIdSet = useMemo(() => new Set(constructorIds.filter((id): id is number => id !== null)), [constructorIds]);

  const suggestions = useMemo(() => {
    const validDriverIds = driverIds.filter((id): id is number => id !== null);
    const validConstructorIds = constructorIds.filter((id): id is number => id !== null);
    if (validDriverIds.length === 0 && validConstructorIds.length === 0) return [];
    return getTeamSuggestions(validDriverIds, validConstructorIds, drivers, constructors, remainingBudget);
  }, [driverIds, constructorIds, drivers, constructors, remainingBudget]);

  const totalPages = Math.max(1, Math.ceil(suggestions.length / PAGE_SIZE));
  const pagedSuggestions = suggestions.slice(suggestionPage * PAGE_SIZE, (suggestionPage + 1) * PAGE_SIZE);

  function handleDriverChange(slotIndex: number, value: string) {
    setDriverIds((prev) => {
      const next = [...prev];
      next[slotIndex] = value ? parseInt(value, 10) : null;
      return next;
    });
    setSuggestionPage(0);
  }

  function handleConstructorChange(slotIndex: number, value: string) {
    setConstructorIds((prev) => {
      const next = [...prev];
      next[slotIndex] = value ? parseInt(value, 10) : null;
      return next;
    });
    setSuggestionPage(0);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
        <span className="ml-3 text-zinc-400">Loading team data...</span>
      </div>
    );
  }

  if (drivers.length === 0 && constructors.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        No fantasy data available
      </div>
    );
  }

  const teamComplete = selectedDriverIdSet.size === DRIVER_SLOTS && selectedConstructorIdSet.size === CONSTRUCTOR_SLOTS;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Round indicator */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-200">My Team</span>
        <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">Round {round}</span>
      </div>

      {/* Team Selection */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div
          className="px-3 sm:px-4 py-3 border-b border-zinc-800 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setTeamCollapsed((v) => !v)}
        >
          <div className="flex items-center">
            <span className="text-zinc-500 mr-2 text-xs">{teamCollapsed ? "\u25B6" : "\u25BC"}</span>
            <h2 className="font-semibold text-zinc-200">Team Selection</h2>
            <InfoTooltip text="Select your 5 drivers and 2 constructors. The budget can exceed $100M for simulation purposes. Your team is saved automatically." />
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-mono font-semibold ${teamCost > BUDGET_CAP ? "text-amber-400" : "text-zinc-200"}`}>
              {formatPrice(teamCost)}
            </span>
            {teamCost > BUDGET_CAP && (
              <span className="text-xs text-amber-400">over cap</span>
            )}
          </div>
        </div>

        {!teamCollapsed && (
          <div className="p-3 sm:p-4">
            {/* Drivers */}
            <div className="mb-4">
              <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Drivers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {driverIds.map((selectedId, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-zinc-600 text-xs font-mono w-4 shrink-0">{i + 1}</span>
                    <select
                      value={selectedId ?? ""}
                      onChange={(e) => handleDriverChange(i, e.target.value)}
                      className="flex-1 bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:border-red-500 focus:outline-none"
                    >
                      <option value="">Select driver...</option>
                      {sortedDrivers.map((d) => {
                        const isSelected = selectedDriverIdSet.has(d.id) && d.id !== selectedId;
                        return (
                          <option key={d.id} value={d.id} disabled={isSelected}>
                            {d.firstName} {d.lastName} - {formatPrice(d.price)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Constructors */}
            <div>
              <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Constructors</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {constructorIds.map((selectedId, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-zinc-600 text-xs font-mono w-4 shrink-0">{i + 1}</span>
                    <select
                      value={selectedId ?? ""}
                      onChange={(e) => handleConstructorChange(i, e.target.value)}
                      className="flex-1 bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 py-2 border border-zinc-700 focus:border-red-500 focus:outline-none"
                    >
                      <option value="">Select constructor...</option>
                      {sortedConstructors.map((c) => {
                        const isSelected = selectedConstructorIdSet.has(c.id) && c.id !== selectedId;
                        return (
                          <option key={c.id} value={c.id} disabled={isSelected}>
                            {c.name} - {formatPrice(c.price)}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Remaining Budget */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-zinc-200">Remaining Budget</label>
            <InfoTooltip text="Enter your available budget for swaps. Only upgrades that fit within this budget will be shown. If a driver costs more than your current one, the price difference must fit here." />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-sm">$</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={remainingBudget}
              onChange={(e) => {
                setRemainingBudget(Math.max(0, parseFloat(e.target.value) || 0));
                setSuggestionPage(0);
              }}
              className="w-20 bg-zinc-800 text-zinc-200 text-sm font-mono rounded-lg px-2 py-1.5 border border-zinc-700 focus:border-red-500 focus:outline-none text-right"
            />
            <span className="text-zinc-400 text-sm">M</span>
          </div>
          <div className="flex gap-1.5">
            {[0, 1, 2.5, 5, 10].map((preset) => (
              <button
                key={preset}
                onClick={() => { setRemainingBudget(preset); setSuggestionPage(0); }}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  remainingBudget === preset
                    ? "bg-red-600 text-white"
                    : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700"
                }`}
              >
                {preset === 0 ? "Free" : `${preset}M`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Optimization Suggestions */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800">
        <div
          className="px-3 sm:px-4 py-3 border-b border-zinc-800 flex items-center justify-between cursor-pointer select-none"
          onClick={() => setSuggestionsCollapsed((v) => !v)}
        >
          <div className="flex items-center">
            <span className="text-zinc-500 mr-2 text-xs">{suggestionsCollapsed ? "\u25B6" : "\u25BC"}</span>
            <h2 className="font-semibold text-zinc-200">Upgrade Suggestions</h2>
            <InfoTooltip text="Shows which available drivers and constructors have more Fantasy points than your current team members and fit within your remaining budget. Sorted by biggest points improvement." />
          </div>
          {suggestions.length > 0 && (
            <span className="text-xs text-zinc-500">{suggestions.length} upgrades</span>
          )}
        </div>

        {!suggestionsCollapsed && (
          <div className="p-3 sm:p-4">
            {!teamComplete ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Select all 5 drivers and 2 constructors to see upgrade suggestions.
              </div>
            ) : suggestions.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No upgrades available for this budget. Try increasing your remaining budget.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {pagedSuggestions.map((s, i) => (
                    <SuggestionCard key={`${s.current.id}-${s.upgrade.id}`} suggestion={s} index={suggestionPage * PAGE_SIZE + i} />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                      onClick={() => setSuggestionPage((p) => Math.max(0, p - 1))}
                      disabled={suggestionPage === 0}
                      className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-zinc-500">
                      {suggestionPage + 1} / {totalPages} ({suggestions.length})
                    </span>
                    <button
                      onClick={() => setSuggestionPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={suggestionPage >= totalPages - 1}
                      className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion, index }: { suggestion: PointsSwapSuggestion; index: number }) {
  const { current, upgrade, pointsDelta, priceDelta, type } = suggestion;

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 hover:border-zinc-600 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="text-zinc-600 text-sm font-mono w-6 shrink-0">
            #{index + 1}
          </span>

          {/* Current */}
          <div className="min-w-0">
            <div className="font-medium text-red-400 truncate">{current.name}</div>
            <div className="text-xs text-zinc-500 truncate">{current.teamName}</div>
          </div>

          <div className="text-zinc-500 shrink-0 px-1">&rarr;</div>

          {/* Upgrade */}
          <div className="min-w-0">
            <div className="font-medium text-emerald-400 truncate">{upgrade.name}</div>
            <div className="text-xs text-zinc-500 truncate">{upgrade.teamName}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 shrink-0 text-right">
          <div>
            <div className="text-xs text-zinc-500">Points</div>
            <div className="text-sm font-mono text-emerald-400">
              +{pointsDelta} pts
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Cost</div>
            <div className={`text-sm font-mono ${priceDelta <= 0 ? "text-emerald-400" : "text-yellow-400"}`}>
              {priceDelta <= 0 ? "" : "+"}{priceDelta.toFixed(1)}M
            </div>
          </div>
        </div>
      </div>

      {/* Detail line */}
      <div className="mt-3 flex gap-3 sm:gap-6 flex-wrap text-xs text-zinc-500">
        <span className={`px-1.5 py-0.5 rounded text-xs ${type === "driver" ? "bg-zinc-700/50" : "bg-zinc-700/50 text-zinc-400"}`}>
          {type === "driver" ? "Driver" : "Constructor"}
        </span>
        <span>{current.name}: {current.overallPoints} pts / {formatPrice(current.price)}</span>
        <span>{upgrade.name}: {upgrade.overallPoints} pts / {formatPrice(upgrade.price)}</span>
      </div>
    </div>
  );
}
