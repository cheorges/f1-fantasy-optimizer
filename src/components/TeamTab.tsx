"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { FantasyDriver, FantasyConstructor, FantasyTeam, TeamStore, PointsSwapSuggestion } from "@/lib/types";
import { loadTeams, saveTeams, makeTeam, getTeamSuggestions, mergePracticeSwaps, MAX_TEAMS } from "@/lib/team-optimizer";
import type { DriverAnalysis, ConstructorAnalysis } from "@/lib/types";
import type { DriversResponse } from "@/lib/api-types";
import { generateRecommendations, generateConstructorRecommendations } from "@/lib/swaps";
import { getLiveSessionMessage } from "@/lib/live-session";
import { canonicalTeam } from "@/lib/team-names";
import { formatPrice } from "@/lib/format";
import { CORRECTION_MIN, CORRECTION_MAX } from "@/lib/config";
import CollapsibleSection from "@/components/CollapsibleSection";
import Pagination from "@/components/Pagination";
import BudgetSlider from "@/components/BudgetSlider";
import InfoTooltip from "@/components/InfoTooltip";
import ToggleSwitch from "@/components/ToggleSwitch";

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
  return { version: 3, teams: [first], activeId: first.id };
}

export default function TeamTab({ drivers, constructors, round, loading }: TeamTabProps) {
  // Held in a ref so the save effect can recognise it by identity and skip it.
  const initial = useRef<TeamStore>(initialStore());
  const [store, setStore] = useState<TeamStore>(initial.current);
  const [renaming, setRenaming] = useState(false);
  const [teamCollapsed, setTeamCollapsed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [suggestionPage, setSuggestionPage] = useState(0);

  // Practice pace is the home page's question ("who is faster"), asked here about your own
  // line-up. Off by default and only fetched once switched on, so the page costs nothing
  // extra for anyone who doesn't want it.
  const [includePractice, setIncludePractice] = useState(false);
  const [practiceDrivers, setPracticeDrivers] = useState<DriverAnalysis[]>([]);
  const [practiceConstructors, setPracticeConstructors] = useState<ConstructorAnalysis[]>([]);
  const [practiceState, setPracticeState] = useState<"idle" | "loading" | "ready" | "blocked" | "error">("idle");

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
    setSuggestionPage(0);
  }

  function handleDeleteTeam() {
    setStore((prev) => {
      if (prev.teams.length <= 1) return prev;
      const teams = prev.teams.filter((t) => t.id !== prev.activeId);
      return { ...prev, teams, activeId: teams[0]!.id };
    });
    setRenaming(false);
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

  // The 100M cap applies to what was paid, but the app only sees today's prices. The
  // correction bridges the two, and the remaining budget then follows — so it moves on
  // its own when a driver is swapped, which a hand-entered remaining budget never did.
  const effectiveCost = teamCost - activeTeam.budgetCorrection;
  const remainingBudget = BUDGET_CAP - effectiveCost;
  const overCap = effectiveCost > BUDGET_CAP;

  // Fetched without a session_key, so the API picks the latest practice session — the same
  // default the home page lands on. Runs once, not on every toggle.
  // Guarded by a ref, not by practiceState: depending on the state this effect sets would
  // re-run it on the first setState, and the cleanup would then cancel the fetch it just
  // started. Toggling off mid-flight lets the result land anyway — the block is collapsed,
  // and the data is ready when it is opened again.
  const practiceRequested = useRef(false);
  useEffect(() => {
    if (!includePractice) return;
    if (practiceRequested.current) return;
    practiceRequested.current = true;
    setPracticeState("loading");

    (async () => {
      try {
        const res = await fetch("/api/drivers");
        const liveMessage = await getLiveSessionMessage(res);
        if (liveMessage) {
          setPracticeState("blocked");
          return;
        }
        if (!res.ok) throw new Error("Failed to load practice data");

        const data: DriversResponse = await res.json();
        setPracticeDrivers(data.drivers);
        setPracticeConstructors(data.constructors);
        setPracticeState("ready");
      } catch {
        setPracticeState("error");
      }
    })();
  }, [includePractice]);

  const selectedDriverIdSet = useMemo(() => new Set(filled(driverIds)), [driverIds]);
  const selectedConstructorIdSet = useMemo(() => new Set(filled(constructorIds)), [constructorIds]);

  const suggestions = useMemo(() => {
    const validDriverIds = filled(driverIds);
    const validConstructorIds = filled(constructorIds);
    if (validDriverIds.length === 0 && validConstructorIds.length === 0) return [];
    return getTeamSuggestions(validDriverIds, validConstructorIds, drivers, constructors, remainingBudget);
  }, [driverIds, constructorIds, drivers, constructors, remainingBudget]);


  // The team is keyed by Fantasy player id, the practice data by three-letter acronym and
  // canonical team name — the same two joins the server already uses in analyzer.ts.
  const teamTlas = useMemo(() => {
    const set = new Set<string>();
    for (const id of filled(driverIds)) {
      const d = drivers.find((d) => d.id === id);
      if (d) set.add(d.tla.toUpperCase());
    }
    return set;
  }, [driverIds, drivers]);

  const teamConstructorKeys = useMemo(() => {
    const set = new Set<string>();
    for (const id of filled(constructorIds)) {
      const c = constructors.find((c) => c.id === id);
      if (c) set.add(canonicalTeam(c.name));
    }
    return set;
  }, [constructorIds, constructors]);

  // Same engine as the home page, then narrowed to the drivers you actually hold. Running
  // it unfiltered first keeps one implementation of "what is a faster swap".
  const practiceDriverSwaps = useMemo(() => {
    if (!includePractice || practiceState !== "ready") return [];
    return generateRecommendations(practiceDrivers, remainingBudget)
      .filter((r) => teamTlas.has(r.driverOut.nameAcronym.toUpperCase()));
  }, [includePractice, practiceState, practiceDrivers, remainingBudget, teamTlas]);

  const practiceConstructorSwaps = useMemo(() => {
    if (!includePractice || practiceState !== "ready") return [];
    return generateConstructorRecommendations(practiceConstructors, remainingBudget)
      .filter((r) => teamConstructorKeys.has(canonicalTeam(r.constructorOut.name)));
  }, [includePractice, practiceState, practiceConstructors, remainingBudget, teamConstructorKeys]);

  // One list. Practice entries fold into the points ones rather than sitting beside them.
  const mergedSuggestions = useMemo(
    () => (practiceDriverSwaps.length === 0 && practiceConstructorSwaps.length === 0
      ? suggestions
      : mergePracticeSwaps(suggestions, practiceDriverSwaps, practiceConstructorSwaps, drivers, constructors)),
    [suggestions, practiceDriverSwaps, practiceConstructorSwaps, drivers, constructors],
  );

  const practiceSessionName = practiceDrivers[0]?.sessionName ?? null;

  const totalPages = Math.max(1, Math.ceil(mergedSuggestions.length / PAGE_SIZE));
  const pagedSuggestions = mergedSuggestions.slice(suggestionPage * PAGE_SIZE, (suggestionPage + 1) * PAGE_SIZE);


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

        <div className="flex items-center gap-2 flex-wrap">
          {renaming ? (
            <input
              autoFocus
              value={activeTeam.name}
              onChange={(e) => updateActiveTeam({ name: e.target.value })}
              onBlur={() => setRenaming(false)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") setRenaming(false); }}
              maxLength={24}
              className="min-h-[44px] bg-zinc-800 text-zinc-200 text-sm rounded-lg px-3 border border-zinc-700 focus:border-red-500 focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setRenaming(true)}
              className="min-h-[44px] px-3 rounded-lg text-xs bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700 transition-colors"
            >
              Rename
            </button>
          )}
          {store.teams.length > 1 && (
            <button
              onClick={handleDeleteTeam}
              className="min-h-[44px] px-3 rounded-lg text-xs bg-zinc-800 text-zinc-400 hover:text-red-400 border border-zinc-700 transition-colors"
            >
              Delete
            </button>
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
            <span className={`text-sm font-mono font-semibold ${overCap ? "text-amber-400" : "text-zinc-200"}`}>
              {formatPrice(effectiveCost)} / {formatPrice(BUDGET_CAP)}
            </span>
            {overCap && (
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

      {/* Budget correction */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-zinc-200">Budget Correction</span>
          <InfoTooltip text="The official game caps your team at $100M based on what you paid. This app only sees today's prices, so a squad whose drivers gained value looks more expensive than it was. Set this to the difference until the figure above matches what the official app shows you — the remaining budget, and the upgrade suggestions, then follow from it and stay right as you swap." />
        </div>
        <BudgetSlider
          value={activeTeam.budgetCorrection}
          onChange={(budgetCorrection) => { updateActiveTeam({ budgetCorrection }); setSuggestionPage(0); }}
          disabled={false}
          label="Value gained since purchase"
          min={CORRECTION_MIN}
          max={CORRECTION_MAX}
        />
        <div className="mt-3 pt-3 border-t border-zinc-800 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="text-zinc-500">Market value</div>
            <div className="text-zinc-300 font-mono">{formatPrice(teamCost)}</div>
          </div>
          <div>
            <div className="text-zinc-500">Effectively spent</div>
            <div className="text-zinc-300 font-mono">{formatPrice(effectiveCost)}</div>
          </div>
          <div>
            <div className="text-zinc-500">Remaining</div>
            <div className={`font-mono ${remainingBudget < 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {formatPrice(remainingBudget)}
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Suggestions */}
      <CollapsibleSection
        title="Upgrade Suggestions"
        info="Which available drivers and constructors beat one you hold, within your remaining budget. By default that means more Fantasy points. Switch on Include FP and anyone who was quicker in the latest practice session joins the same list, marked as such — a driver can be fast this weekend and still be behind on points. Points and lap times are shown separately rather than combined into one score, because there is no honest exchange rate between them."
        collapsed={suggestionsCollapsed}
        onToggle={() => setSuggestionsCollapsed((v) => !v)}
        headerRight={
          mergedSuggestions.length > 0 ? (
            <span className="text-xs text-zinc-500">{mergedSuggestions.length} upgrades</span>
          ) : undefined
        }
      >
          <div className="p-3 sm:p-4">
            <div className="pb-3 mb-3 border-b border-zinc-800">
              <ToggleSwitch
                checked={includePractice}
                onChange={(v) => { setIncludePractice(v); setSuggestionPage(0); }}
                label="Include FP"
                hint="Also list drivers who were quicker in practice, not only higher on points"
              />
            </div>
            {includePractice && practiceState !== "ready" && (
              <div className="mb-3 text-xs text-zinc-500">
                {practiceState === "loading" && "Loading practice data..."}
                {practiceState === "blocked" && "A session is running — OpenF1's free tier blocks practice data while it is live, so only points-based upgrades are listed."}
                {practiceState === "error" && "Practice data could not be loaded; only points-based upgrades are listed."}
              </div>
            )}
            {includePractice && practiceState === "ready" && practiceSessionName && (
              <div className="mb-3 text-xs text-zinc-500">
                Practice pace from {practiceSessionName}.
              </div>
            )}
            {!teamComplete ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Select all 5 drivers and 2 constructors to see upgrade suggestions.
              </div>
            ) : mergedSuggestions.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No upgrades available for this budget. Try increasing your remaining budget.
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {pagedSuggestions.map((s) => (
                    <SuggestionCard key={`${s.type}-${s.current.id}-${s.upgrade.id}`} suggestion={s} />
                  ))}
                </div>
                <Pagination
                  page={suggestionPage}
                  totalPages={totalPages}
                  total={mergedSuggestions.length}
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

function SuggestionCard({ suggestion }: { suggestion: PointsSwapSuggestion }) {
  const { current, upgrade, pointsDelta, priceDelta, timeDelta, qualifiedBy } = suggestion;

  // For constructors the name and the team are the same string, so the second line would
  // just repeat the first.
  const side = (p: typeof current, tone: string, align: string) => (
    <div className={`min-w-0 ${align}`}>
      <div className={`font-medium truncate ${tone}`}>
        <span className="sm:hidden">{p.short}</span>
        <span className="hidden sm:inline">{p.name}</span>
      </div>
      {p.teamName !== p.name && (
        <div className="text-xs text-zinc-500 truncate">{p.teamName}</div>
      )}
      <div className="text-xs text-zinc-400 font-mono mt-1 truncate">
        {p.overallPoints} pts · {formatPrice(p.price)}
      </div>
    </div>
  );

  const badge =
    qualifiedBy === "pace"
      ? { label: "Faster in practice", className: "bg-sky-900/50 text-sky-300" }
      : qualifiedBy === "both"
        ? { label: "Points + practice", className: "bg-emerald-900/50 text-emerald-300" }
        : { label: "More points", className: "bg-zinc-700/50 text-zinc-400" };

  return (
    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 hover:border-zinc-600 transition-colors">
      {/* Who for whom. The absolute figures sit with the person they describe, so the
          deltas below are the only place a number is stated twice — as a difference. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
        {side(current, "text-red-400", "text-left")}
        <div className="text-zinc-600 pt-0.5">→</div>
        {side(upgrade, "text-emerald-400", "text-right")}
      </div>

      <div className="mt-3 pt-3 border-t border-zinc-700/50 flex items-center gap-4 flex-wrap">
        <Delta label="Points" value={`${pointsDelta > 0 ? "+" : ""}${pointsDelta}`} unit="pts"
          tone={pointsDelta > 0 ? "text-emerald-400" : "text-zinc-500"} />
        {timeDelta !== undefined && (
          <Delta label="Practice" value={`-${timeDelta.toFixed(3)}`} unit="s" tone="text-emerald-400" />
        )}
        <Delta label="Cost" value={`${priceDelta <= 0 ? "" : "+"}${priceDelta.toFixed(1)}`} unit="M"
          tone={priceDelta <= 0 ? "text-emerald-400" : "text-yellow-400"} />
        <span className={`ml-auto px-2 py-0.5 rounded text-xs shrink-0 ${badge.className}`}>
          {badge.label}
        </span>
      </div>
    </div>
  );
}

function Delta({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: string }) {
  return (
    <div className="leading-tight">
      <div className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</div>
      <div className={`font-mono text-base ${tone}`}>
        {value}<span className="text-xs text-zinc-500 ml-0.5">{unit}</span>
      </div>
    </div>
  );
}
