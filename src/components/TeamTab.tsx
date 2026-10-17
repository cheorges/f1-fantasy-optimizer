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
import { AVAILABLE_MIN, AVAILABLE_MAX } from "@/lib/config";
import CollapsibleSection from "@/components/CollapsibleSection";
import Pagination from "@/components/Pagination";
import BudgetSlider from "@/components/BudgetSlider";
import ToggleSwitch from "@/components/ToggleSwitch";
import ConfirmDialog from "@/components/ConfirmDialog";
import SegmentedControl from "@/components/SegmentedControl";

interface TeamTabProps {
  drivers: FantasyDriver[];
  constructors: FantasyConstructor[];
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

function isComplete(team: FantasyTeam): boolean {
  return filled(fitSlots(team.driverIds, DRIVER_SLOTS)).length === DRIVER_SLOTS
    && filled(fitSlots(team.constructorIds, CONSTRUCTOR_SLOTS)).length === CONSTRUCTOR_SLOTS;
}

function initialStore(): TeamStore {
  const first = makeTeam(0);
  return { version: 4, teams: [first], activeId: first.id };
}

export default function TeamTab({ drivers, constructors, loading }: TeamTabProps) {
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
  // A finished line-up is set once and then mostly looked past, so it starts folded away.
  // Decided when a team is loaded or picked, not on every edit: folding the moment the
  // seventh pick lands would yank the list away mid-task.
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
    const active = teams.find((t) => t.id === saved.activeId) ?? teams[0];
    setTeamCollapsed(active ? isComplete(active) : false);
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
    setTeamCollapsed(false);
    setSuggestionPage(0);
  }

  function selectTeam(id: string) {
    setStore((prev) => ({ ...prev, activeId: id }));
    const team = store.teams.find((t) => t.id === id);
    setTeamCollapsed(team ? isComplete(team) : false);
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

  // The free budget is the input, so the spend against the cap follows from it rather
  // than from `teamCost`. Market value is today's price of the squad and says nothing
  // about the cap, which applies to what was paid — the two are shown side by side and
  // deliberately not reconciled.
  const remainingBudget = activeTeam.availableBudget;
  const effectiveCost = BUDGET_CAP - remainingBudget;

  // Fetched without a session_key, so the API picks the latest practice that has run — the same
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
          // Not a final answer: the session ends and the endpoint opens again. Releasing
          // the guard makes toggling the switch off and on a retry — otherwise the notice
          // would stand for the lifetime of the mount.
          practiceRequested.current = false;
          setPracticeState("blocked");
          return;
        }
        if (!res.ok) throw new Error("Failed to load practice data");

        const data: DriversResponse = await res.json();
        setPracticeDrivers(data.drivers);
        setPracticeConstructors(data.constructors);
        setPracticeState("ready");
      } catch {
        practiceRequested.current = false;
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
  // Both sides are filtered: out must be held, in must not. Swapping one of your own for
  // another is not a move the game can make, and a held driver who is quicker and cheaper
  // would otherwise qualify against any budget.
  const practiceDriverSwaps = useMemo(() => {
    if (!includePractice || practiceState !== "ready") return [];
    return generateRecommendations(practiceDrivers, remainingBudget)
      .filter((r) => teamTlas.has(r.driverOut.nameAcronym.toUpperCase())
        && !teamTlas.has(r.driverIn.nameAcronym.toUpperCase()));
  }, [includePractice, practiceState, practiceDrivers, remainingBudget, teamTlas]);

  const practiceConstructorSwaps = useMemo(() => {
    if (!includePractice || practiceState !== "ready") return [];
    return generateConstructorRecommendations(practiceConstructors, remainingBudget)
      .filter((r) => teamConstructorKeys.has(canonicalTeam(r.constructorOut.name))
        && !teamConstructorKeys.has(canonicalTeam(r.constructorIn.name)));
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
    <div className="flex flex-col gap-5">
      {confirmDelete && (
        <ConfirmDialog
          title="Delete this team?"
          body={<><span className="text-zinc-200 font-medium">{activeTeam.name}</span> and its line-up will be removed. This cannot be undone.</>}
          confirmLabel="Delete"
          onConfirm={handleDeleteTeam}
          onCancel={() => setConfirmDelete(false)}
        />
      )}

      {/* Team switcher. Renaming swaps the row for an edit field; Delete lives there too,
          on its own line under the field and behind a confirmation. */}
      {renaming ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
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
              className="flex-1 min-w-0 min-h-[44px] bg-zinc-900 text-zinc-100 text-sm rounded-lg px-3 border border-zinc-800 focus:border-zinc-500 focus:outline-none"
            />
            <button
              onClick={saveRename}
              className="tap-target h-9 px-3 rounded-lg text-[13px] font-medium bg-zinc-100 text-zinc-900 hover:bg-white transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setRenaming(false)}
              className="tap-target h-9 px-3 rounded-lg text-[13px] bg-zinc-900 text-zinc-300 hover:text-zinc-100 transition-colors"
            >
              Cancel
            </button>
          </div>
          {store.teams.length > 1 && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="tap-target self-start mt-1 text-[13px] text-red-400 hover:text-red-300"
            >
              Delete team
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <SegmentedControl
            ariaLabel="Teams"
            className="flex-1"
            options={store.teams.map((t) => ({ value: t.id, label: t.name }))}
            value={store.activeId}
            onChange={selectTeam}
          >
            {store.teams.length < MAX_TEAMS && (
              <button
                type="button"
                onClick={handleAddTeam}
                aria-label="Add team"
                className="tap-target h-[30px] rounded-[7px] text-base text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                +
              </button>
            )}
          </SegmentedControl>
          <button
            onClick={startRename}
            aria-label="Rename or delete team"
            className="tap-target w-9 h-9 shrink-0 rounded-lg bg-zinc-900 text-zinc-400 hover:text-zinc-200 inline-flex items-center justify-center transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
              <path d="M10.5 2.5l3 3L6 13H3v-3z" />
            </svg>
          </button>
        </div>
      )}

      {/* Team Selection */}
      <CollapsibleSection
        title="Line-up"
        info="Select your 5 drivers and 2 constructors, matching the team you actually field. Your teams are saved automatically."
        collapsed={teamCollapsed}
        onToggle={() => setTeamCollapsed((v) => !v)}
        headerRight={
          /* The market value of the line-up below, so it stays readable with the section
             collapsed. Not a cap figure: the cap applies to purchase prices, this is
             today's. */
          <span className="flex items-baseline gap-1.5">
            <span className="text-xs text-zinc-500">Market value</span>
            <span className="text-[13px] font-mono text-zinc-200">{formatPrice(teamCost)}</span>
          </span>
        }
        collapsedContent={
          <button
            type="button"
            onClick={() => setTeamCollapsed(false)}
            className="w-full min-h-[44px] px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 flex items-center justify-between gap-3 text-left transition-colors"
          >
            <span className="text-[13px] text-zinc-300">
              {selectedDriverIdSet.size} drivers · {selectedConstructorIdSet.size} constructors
            </span>
            <span className="text-xs text-zinc-500">Edit</span>
          </button>
        }
      >
          <div>
            {/* Drivers */}
            <div className="mb-3">
              <h3 className="text-xs text-zinc-500 mb-1.5">Drivers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                {driverIds.map((selectedId, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-zinc-600 text-xs font-mono w-4 shrink-0">{i + 1}</span>
                    <select
                      value={selectedId ?? ""}
                      onChange={(e) => handleDriverChange(i, e.target.value)}
                      className="flex-1 min-w-0 min-h-[44px] bg-zinc-900 text-zinc-100 text-sm rounded-lg px-3 border border-zinc-800 focus:border-zinc-500 focus:outline-none"
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
              <h3 className="text-xs text-zinc-500 mb-1.5">Constructors</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {constructorIds.map((selectedId, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-zinc-600 text-xs font-mono w-4 shrink-0">{i + 1}</span>
                    <select
                      value={selectedId ?? ""}
                      onChange={(e) => handleConstructorChange(i, e.target.value)}
                      className="flex-1 min-w-0 min-h-[44px] bg-zinc-900 text-zinc-100 text-sm rounded-lg px-3 border border-zinc-800 focus:border-zinc-500 focus:outline-none"
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

      {/* Optimization Suggestions */}
      <CollapsibleSection
        title="Upgrades"
        info="Which available drivers and constructors beat one you hold, within your available budget. By default that means more Fantasy points. Switch on Include practice pace and anyone who was quicker in the latest practice session joins the same list, marked as such — a driver can be fast this weekend and still be behind on points. Points and lap times are shown separately rather than combined into one score, because there is no honest exchange rate between them."
        collapsed={suggestionsCollapsed}
        onToggle={() => setSuggestionsCollapsed((v) => !v)}
        headerRight={
          mergedSuggestions.length > 0 ? (
            <span className="text-xs text-zinc-500 tabular-nums">{mergedSuggestions.length}</span>
          ) : undefined
        }
      >
          <div>
            {/* The two controls that shape this list live with it: the budget decides what
                is affordable, the switch decides what counts as an upgrade. */}
            <div className="pb-2 border-b border-zinc-800 flex flex-col">
              <ToggleSwitch
                checked={includePractice}
                onChange={(v) => { setIncludePractice(v); setSuggestionPage(0); }}
                label="Include practice pace"
              />

              <div>
                <BudgetSlider
                  value={activeTeam.availableBudget}
                  onChange={(availableBudget) => { updateActiveTeam({ availableBudget }); setSuggestionPage(0); }}
                  disabled={false}
                  label="Free budget in your Fantasy app"
                  min={AVAILABLE_MIN}
                  max={AVAILABLE_MAX}
                />
                {/* Neither "remaining" nor market value here: the first is the slider's
                    own value shown above, the second sits in the Line-up header with the
                    line-up it describes. */}
                <div className="flex items-baseline gap-1.5 text-xs">
                  <span className="text-zinc-500">Spent against the cap</span>
                  <span className="text-zinc-300 font-mono">
                    {formatPrice(effectiveCost)} / {formatPrice(BUDGET_CAP)}
                  </span>
                </div>
              </div>
            </div>
            {includePractice && practiceState !== "ready" && (
              <div className="mt-2 text-xs text-zinc-500">
                {practiceState === "loading" && "Loading practice data..."}
                {practiceState === "blocked" && "A session is running — OpenF1's free tier blocks practice data while it is live, so only points-based upgrades are listed."}
                {practiceState === "error" && "Practice data could not be loaded; only points-based upgrades are listed."}
              </div>
            )}
            {includePractice && practiceState === "ready" && practiceSessionName && (
              <div className="mt-2 text-xs text-zinc-500">
                Practice pace from {practiceSessionName}.
              </div>
            )}
            {!teamComplete ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                Select all 5 drivers and 2 constructors to see upgrade suggestions.
              </div>
            ) : mergedSuggestions.length === 0 ? (
              <div className="text-center py-8 text-zinc-500 text-sm">
                No upgrades within your available budget. Try raising it if the figure is out of date.
              </div>
            ) : (
              <>
                <div className="divide-y divide-zinc-800/70">
                  {pagedSuggestions.map((s) => (
                    <SuggestionCard key={`${s.type}-${s.current.id}-${s.upgrade.id}`} suggestion={s} />
                  ))}
                </div>
                <Pagination
                  page={suggestionPage}
                  totalPages={totalPages}
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

  // Points-only is the default and needs no label; the practice cases say why they are here.
  const reason =
    qualifiedBy === "pace" ? { label: "faster in practice", className: "text-sky-400" }
      : qualifiedBy === "both" ? { label: "points + practice", className: "text-emerald-400/80" }
        : null;

  // For constructors the name and the team are the same string, so the detail line
  // carries prices instead.
  const isConstructor = current.teamName === current.name;

  return (
    <div className="py-2.5 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">
          <span className="text-red-400"><span className="sm:hidden">{current.short}</span><span className="hidden sm:inline">{current.name}</span></span>
          <span className="text-zinc-600 mx-1.5">→</span>
          <span className="text-emerald-400"><span className="sm:hidden">{upgrade.short}</span><span className="hidden sm:inline">{upgrade.name}</span></span>
        </div>
        <div className="text-xs text-zinc-500 truncate mt-0.5">
          {isConstructor
            ? `${current.overallPoints} → ${upgrade.overallPoints} pts · ${formatPrice(current.price)} → ${formatPrice(upgrade.price)}`
            : `${current.teamName} → ${upgrade.teamName} · ${current.overallPoints} → ${upgrade.overallPoints} pts`}
          {reason && <span className={reason.className}> · {reason.label}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right font-mono text-[13px] leading-snug tabular-nums">
        <div className={pointsDelta > 0 ? "text-emerald-400" : "text-zinc-500"}>
          {pointsDelta > 0 ? "+" : ""}{pointsDelta} pts
        </div>
        {timeDelta !== undefined && <div className="text-emerald-400">-{timeDelta.toFixed(3)}s</div>}
        <div className={priceDelta <= 0 ? "text-emerald-400" : "text-yellow-400"}>
          {priceDelta <= 0 ? "" : "+"}{priceDelta.toFixed(1)}M
        </div>
      </div>
    </div>
  );
}
