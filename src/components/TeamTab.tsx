"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { FantasyDriver, FantasyConstructor, FantasyTeam, TeamStore, PointsSwapSuggestion } from "@/lib/types";
import { loadTeams, saveTeams, makeTeam, getTeamSuggestions, MAX_TEAMS } from "@/lib/team-optimizer";
import { formatPrice } from "@/lib/format";
import CollapsibleSection from "@/components/CollapsibleSection";
import Pagination from "@/components/Pagination";
import BudgetSlider from "@/components/BudgetSlider";
import InfoTooltip from "@/components/InfoTooltip";
import ConfirmDialog from "@/components/ConfirmDialog";

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

function fitSlots(ids: (number | null)[], slots: number): (number | null)[] {
  const next: (number | null)[] = [...ids];
  while (next.length < slots) next.push(null);
  return next.slice(0, slots);
}

function filled(ids: (number | null)[]): number[] {
  return ids.filter((id): id is number => id !== null);
}

function initialStore(): TeamStore {
  const first = makeTeam(0);
  return { version: 2, teams: [first], activeId: first.id };
}

export default function TeamTab({ drivers, constructors, round, loading }: TeamTabProps) {
  // Held in a ref so the save effect can recognise it by identity and skip it.
  const initial = useRef<TeamStore>(initialStore());
  const [store, setStore] = useState<TeamStore>(initial.current);
  const [renaming, setRenaming] = useState(false);
  // The edit is held here, not written straight to the store, so Cancel can actually
  // discard it rather than leaving whatever was typed behind.
  const [nameDraft, setNameDraft] = useState("");
  // Deleting a team throws away a line-up the user typed in by hand, and it cannot be
  // undone — so it asks first instead of acting on the tap.
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [teamCollapsed, setTeamCollapsed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [suggestionPage, setSuggestionPage] = useState(0);

  const restoredFromStorage = useRef(false);

  // Restore the saved teams once the fantasy data is available to validate IDs against.
  // localStorage is read in an effect (not lazy state init) to avoid SSR hydration
  // mismatch, and guarded so a later data refresh can't clobber the user's edits.
  useEffect(() => {
    if (restoredFromStorage.current) return;
    if (drivers.length === 0 && constructors.length === 0) return;

    const saved = loadTeams();
    restoredFromStorage.current = true;

    const teams = saved.teams.map((team) => ({
      ...team,
      driverIds: fitSlots(
        team.driverIds.map((id) => (drivers.some((d) => d.id === id) ? id : null)),
        DRIVER_SLOTS,
      ),
      constructorIds: fitSlots(
        team.constructorIds.map((id) => (constructors.some((c) => c.id === id) ? id : null)),
        CONSTRUCTOR_SLOTS,
      ),
    }));

    setStore({ ...saved, teams });
  }, [drivers, constructors]);

  // Save on change, but never the initial empty store — it would overwrite the saved one.
  // Checking the ref alone is not enough: the restore effect sets it and queues setStore in
  // the same commit, so this effect still sees the initial value on that pass.
  useEffect(() => {
    if (!restoredFromStorage.current) return;
    if (store === initial.current) return;
    saveTeams(store);
  }, [store]);

  const activeTeam = useMemo(
    () => store.teams.find((t) => t.id === store.activeId) ?? store.teams[0]!,
    [store],
  );

  const driverIds = useMemo(() => fitSlots(activeTeam.driverIds, DRIVER_SLOTS), [activeTeam]);
  const constructorIds = useMemo(() => fitSlots(activeTeam.constructorIds, CONSTRUCTOR_SLOTS), [activeTeam]);

  function updateActiveTeam(patch: Partial<FantasyTeam>) {
    setStore((prev) => ({
      ...prev,
      teams: prev.teams.map((t) => (t.id === prev.activeId ? { ...t, ...patch } : t)),
    }));
  }

  function handleAddTeam() {
    setStore((prev) => {
      if (prev.teams.length >= MAX_TEAMS) return prev;
      // Index by length would collide after a delete, so take the first free slot number.
      let index = 0;
      while (prev.teams.some((t) => t.id === makeTeam(index).id)) index++;
      const team = makeTeam(index);
      return { ...prev, teams: [...prev.teams, team], activeId: team.id };
    });
    setRenaming(false);
    setConfirmDelete(false);
    setSuggestionPage(0);
  }

  function startRename() {
    setNameDraft(activeTeam.name);
    setRenaming(true);
    setConfirmDelete(false);
  }

  function saveRename() {
    // An empty name would leave an unlabelled chip with no way to tell teams apart,
    // so a blank entry keeps the previous one.
    const next = nameDraft.trim();
    if (next) updateActiveTeam({ name: next });
    setRenaming(false);
  }

  function handleDeleteTeam() {
    setStore((prev) => {
      if (prev.teams.length <= 1) return prev;
      const teams = prev.teams.filter((t) => t.id !== prev.activeId);
      return { ...prev, teams, activeId: teams[0]!.id };
    });
    setRenaming(false);
    setConfirmDelete(false);
    setSuggestionPage(0);
  }

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

  const selectedDriverIdSet = useMemo(() => new Set(filled(driverIds)), [driverIds]);
  const selectedConstructorIdSet = useMemo(() => new Set(filled(constructorIds)), [constructorIds]);

  const suggestions = useMemo(() => {
    const validDriverIds = filled(driverIds);
    const validConstructorIds = filled(constructorIds);
    if (validDriverIds.length === 0 && validConstructorIds.length === 0) return [];
    return getTeamSuggestions(validDriverIds, validConstructorIds, drivers, constructors, activeTeam.budget);
  }, [driverIds, constructorIds, drivers, constructors, activeTeam.budget]);

  const totalPages = Math.max(1, Math.ceil(suggestions.length / PAGE_SIZE));
  const pagedSuggestions = suggestions.slice(suggestionPage * PAGE_SIZE, (suggestionPage + 1) * PAGE_SIZE);

  function handleDriverChange(slotIndex: number, value: string) {
    const next = [...driverIds];
    next[slotIndex] = value ? parseInt(value, 10) : null;
    updateActiveTeam({ driverIds: next });
    setSuggestionPage(0);
  }

  function handleConstructorChange(slotIndex: number, value: string) {
    const next = [...constructorIds];
    next[slotIndex] = value ? parseInt(value, 10) : null;
    updateActiveTeam({ constructorIds: next });
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
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this team?"
          body={<><span className="text-zinc-200 font-medium">{activeTeam.name}</span> and its line-up will be removed. This cannot be undone.</>}
          confirmLabel="Delete"
          onConfirm={handleDeleteTeam}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Team switcher */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-3 sm:px-4 py-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-zinc-200">My Teams</span>
          {round > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">Round {round}</span>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {store.teams.map((team) => (
            <button
              key={team.id}
              onClick={() => {
                setStore((prev) => ({ ...prev, activeId: team.id }));
                setRenaming(false);
                setConfirmDelete(false);
                setSuggestionPage(0);
              }}
              className={`min-h-[44px] px-4 rounded-full text-sm font-medium transition-colors ${
                team.id === store.activeId
                  ? "bg-red-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200 active:bg-zinc-700"
              }`}
            >
              {team.name}
            </button>
          ))}
          {store.teams.length < MAX_TEAMS && (
            <button
              onClick={handleAddTeam}
              aria-label="Add team"
              className="min-h-[44px] w-11 rounded-full text-lg bg-zinc-800 text-zinc-400 hover:text-zinc-200 active:bg-zinc-700 transition-colors"
            >
              +
            </button>
          )}
        </div>

        {/* Renaming replaces both buttons: while an edit is pending there is nothing to
            delete yet, and a Delete sitting next to a half-typed name is a mis-tap. */}
        <div className="flex items-center gap-2 flex-wrap">
          {renaming ? (
            <>
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                maxLength={24}
                aria-label="Team name"
                className="min-h-[44px] bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 border border-zinc-700 focus:border-red-500 focus:outline-none"
              />
              <button
                onClick={saveRename}
                className="min-h-[44px] px-3 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-500 active:bg-red-700 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setRenaming(false)}
                className="min-h-[44px] px-3 rounded-lg text-xs bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-700 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startRename}
                className="min-h-[44px] px-3 rounded-lg text-xs bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors"
              >
                Rename
              </button>
              {store.teams.length > 1 && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="min-h-[44px] px-3 rounded-lg text-xs bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-700 transition-colors"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Team Selection */}
      <CollapsibleSection
        title="Team Selection"
        info="Select your 5 drivers and 2 constructors. The budget can exceed $100M for simulation purposes. Your teams are saved automatically."
        collapsed={teamCollapsed}
        onToggle={() => setTeamCollapsed((v) => !v)}
        headerRight={
          <div className="flex items-center gap-3">
            <span className={`text-sm font-mono font-semibold ${teamCost > BUDGET_CAP ? "text-amber-400" : "text-zinc-200"}`}>
              {formatPrice(teamCost)}
            </span>
            {teamCost > BUDGET_CAP && (
              <span className="text-xs text-amber-400">over cap</span>
            )}
          </div>
        }
      >
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
                      className="flex-1 min-h-[44px] bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 border border-zinc-700 focus:border-red-500 focus:outline-none"
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
                      className="flex-1 min-h-[44px] bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 border border-zinc-700 focus:border-red-500 focus:outline-none"
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
      </CollapsibleSection>

      {/* Remaining Budget */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-zinc-200">Remaining Budget</span>
          <InfoTooltip text="Your available budget for swaps on this team. Only upgrades that fit within this budget will be shown. If a driver costs more than your current one, the price difference must fit here." />
        </div>
        <BudgetSlider
          value={activeTeam.budget}
          onChange={(budget) => { updateActiveTeam({ budget }); setSuggestionPage(0); }}
          disabled={false}
          label={activeTeam.name}
        />
      </div>

      {/* Optimization Suggestions */}
      <CollapsibleSection
        title="Upgrade Suggestions"
        info="Shows which available drivers and constructors have more Fantasy points than your current team members and fit within your remaining budget. Sorted by biggest points improvement."
        collapsed={suggestionsCollapsed}
        onToggle={() => setSuggestionsCollapsed((v) => !v)}
        headerRight={
          suggestions.length > 0 ? (
            <span className="text-xs text-zinc-500">{suggestions.length} upgrades</span>
          ) : undefined
        }
      >
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
                <Pagination
                  page={suggestionPage}
                  totalPages={totalPages}
                  total={suggestions.length}
                  onPrev={() => setSuggestionPage((p) => Math.max(0, p - 1))}
                  onNext={() => setSuggestionPage((p) => Math.min(totalPages - 1, p + 1))}
                />
              </>
            )}
          </div>
      </CollapsibleSection>
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

          <div className="text-zinc-500 shrink-0 px-1">→</div>

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
