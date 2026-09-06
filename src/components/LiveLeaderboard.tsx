"use client";

import type { LiveSession } from "@/lib/types";
import { formatCachedAt } from "@/lib/format";

interface LiveLeaderboardProps {
  session: LiveSession | null;
  loading: boolean;
  error: string | null;
}

// The feed's flag words. Anything unrecognised falls through to neutral, see TrackFlag.
const TRACK_STATUS: Record<string, { label: string; dot: string; text: string }> = {
  AllClear: { label: "Green", dot: "bg-emerald-400", text: "text-emerald-300" },
  Yellow: { label: "Yellow flag", dot: "bg-yellow-400", text: "text-yellow-300" },
  Red: { label: "Red flag", dot: "bg-red-500", text: "text-red-300" },
  SCDeployed: { label: "Safety car", dot: "bg-yellow-400", text: "text-yellow-300" },
  VSCDeployed: { label: "Virtual SC", dot: "bg-yellow-400", text: "text-yellow-300" },
  VSCEnding: { label: "VSC ending", dot: "bg-yellow-400", text: "text-yellow-300" },
};

// Which kind of quiet it is, rather than an unexplained empty table.
const IDLE_STATUS: Record<string, string> = {
  Inactive: "has not started yet",
  Finished: "has finished",
  Finalised: "is over, the result is final",
  Ends: "is over",
};

function TrackFlag({ status }: { status: string }) {
  // The feed is undocumented, so an unmapped word is realistic. Raw beats nothing.
  const flag = TRACK_STATUS[status] ?? {
    label: status || "Unknown",
    dot: "bg-zinc-500",
    text: "text-zinc-400",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${flag.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${flag.dot}`} />
      {flag.label}
    </span>
  );
}

export default function LiveLeaderboard({ session, loading, error }: LiveLeaderboardProps) {
  // Only with nothing to fall back on. With a leaderboard on screen a failed refresh gets
  // the strip below instead, rather than replacing live times over one dropped request.
  if (error && !session) {
    return (
      <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-300">
        <p className="font-medium">Live timing is not answering</p>
        <p className="mt-1 text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (loading && !session) {
    return <p className="text-zinc-500 text-sm py-8 text-center">Loading live timing...</p>;
  }

  if (!session) return null;

  const idle = IDLE_STATUS[session.status];

  return (
    // Capped rather than full width: stretched across a desktop the driver sits a hand's
    // width from their own lap time.
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {error && (
        <div
          role="status"
          className="bg-amber-900/30 border border-amber-700/60 rounded-lg px-4 py-2.5 text-amber-200 text-sm"
        >
          Refresh failed, still showing the last times. {error}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">{session.sessionName || "Session"}</h2>
            <p className="text-xs text-zinc-500 truncate">{session.meetingName}</p>
          </div>
          {session.live && session.remaining && (
            <div className="text-right shrink-0">
              <div className="text-lg font-semibold tabular-nums">{session.remaining}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">Remaining</div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
          {session.live ? (
            <TrackFlag status={session.trackStatus} />
          ) : (
            <span className="text-zinc-500">
              {idle ? `This session ${idle}.` : "No session is running."}
            </span>
          )}
          {session.fastestLap && (
            <span>
              Fastest <b className="text-zinc-200 font-semibold tabular-nums">{session.fastestLap}</b>
            </span>
          )}
          <span>{session.drivers.length} drivers</span>
        </div>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
        <div className="grid grid-cols-[2rem_1fr_5rem_4rem_2rem] items-center h-7 px-2 text-[10px] uppercase tracking-wider text-zinc-600 border-b border-zinc-800 bg-white/[0.02]">
          <div className="text-center">P</div>
          <div className="pl-3">Driver</div>
          <div className="text-right">Best</div>
          <div className="text-right">Gap</div>
          <div className="text-center">L</div>
        </div>

        {session.drivers.map((driver) => (
          <div
            key={driver.driverNumber}
            className="grid grid-cols-[2rem_1fr_5rem_4rem_2rem] items-center h-11 px-2 border-b border-zinc-800/60 last:border-b-0"
          >
            <div className="text-center text-xs font-semibold text-zinc-400 tabular-nums">
              {driver.position === Number.MAX_SAFE_INTEGER ? "-" : driver.position}
            </div>

            <div className="flex items-center gap-2 min-w-0 pl-1">
              <span
                className="w-[3px] h-5 rounded-sm shrink-0"
                style={{ backgroundColor: `#${driver.teamColour || "52525b"}` }}
              />
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight">
                  {driver.acronym}
                  {driver.inPit && (
                    <span className="ml-1.5 align-[1px] text-[9px] font-semibold tracking-wider text-amber-400 border border-amber-500/45 rounded px-1">
                      BOX
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500 leading-tight truncate">
                  {driver.teamName}
                </div>
              </div>
            </div>

            <div
              className={`text-right text-xs tabular-nums ${
                driver.driverNumber === session.fastestDriverNumber
                  ? "text-purple-400 font-semibold"
                  : "text-zinc-300"
              }`}
            >
              {driver.bestLapTime ?? "-"}
            </div>

            <div className="text-right text-[11px] text-zinc-500 tabular-nums">
              {driver.gapToLeader ?? "-"}
            </div>

            <div className="text-center text-[11px] text-zinc-500 tabular-nums">{driver.laps}</div>
          </div>
        ))}
      </div>

      <p className="text-center text-[11px] text-zinc-600">
        Official F1 live timing, last read at {formatCachedAt(session.fetchedAt)}
        {session.live && ", refreshing every 5 seconds"}
      </p>
    </div>
  );
}
