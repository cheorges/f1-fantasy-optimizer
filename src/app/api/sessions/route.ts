import { NextResponse } from "next/server";
import { getLatestMeeting, getPracticeSessions } from "@/lib/openf1";

export async function GET(): Promise<NextResponse> {
  try {
    const meeting = await getLatestMeeting();
    if (!meeting) {
      return NextResponse.json({ error: "No meeting found" }, { status: 404 });
    }

    const sessions = await getPracticeSessions(meeting.meeting_key);

    return NextResponse.json({
      meeting,
      sessions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to fetch sessions: ${String(error)}` },
      { status: 500 },
    );
  }
}
