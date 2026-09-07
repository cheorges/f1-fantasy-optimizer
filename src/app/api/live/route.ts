import { NextResponse } from "next/server";
import { getLiveSession, LiveTimingError } from "@/lib/livetiming";
import { MOCK_LIVE_SESSION } from "@/lib/mock-data";
import { USE_MOCK_DATA } from "@/lib/config";
import type { LiveSession } from "@/lib/types";

// The feed is read over a WebSocket, which the Edge runtime has no socket for.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (USE_MOCK_DATA) {
    return NextResponse.json<LiveSession>({ ...MOCK_LIVE_SESSION, fetchedAt: Date.now() });
  }

  try {
    return NextResponse.json<LiveSession>(await getLiveSession());
  } catch (error) {
    // 502, not 500: the upstream feed is what failed.
    const message =
      error instanceof LiveTimingError ? error.message : `Failed to reach live timing: ${String(error)}`;
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
