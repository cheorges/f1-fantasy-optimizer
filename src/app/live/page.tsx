"use client";

import { useEffect, useState } from "react";
import LiveLeaderboard from "@/components/LiveLeaderboard";
import { isSessionOver } from "@/lib/live-session";
import type { LiveSession } from "@/lib/types";

// Matches the route's own cache window: polling faster only repeats the cached answer.
const POLL_INTERVAL_MS = 5_000;

// Before the green light nothing changes for minutes at a time.
const IDLE_POLL_INTERVAL_MS = 30_000;

// The route builds a specific message per failure. A status code tells the reader nothing.
async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string") {
    return (body as { error: string }).error;
  }
  return `Live timing responded with ${res.status}`;
}

export default function LivePage() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = (delay: number) => {
      if (!cancelled) timer = setTimeout(load, delay);
    };

    async function load() {
      try {
        const res = await fetch("/api/live");
        if (!res.ok) throw new Error(await readError(res));
        const data: LiveSession = await res.json();
        if (cancelled) return;
        setSession(data);
        setError(null);

        // `live` is also false before the start, so stop only once it is genuinely over.
        if (!isSessionOver(data.status)) {
          scheduleNext(data.live ? POLL_INTERVAL_MS : IDLE_POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        // The upstream refuses a socket now and then; giving up would end the page.
        scheduleNext(POLL_INTERVAL_MS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return <LiveLeaderboard session={session} loading={loading} error={error} />;
}
