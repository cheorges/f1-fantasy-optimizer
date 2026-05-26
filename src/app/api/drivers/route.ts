import { type NextRequest, NextResponse } from "next/server";
import { analyzeDrivers, analyzeConstructors } from "@/lib/analyzer";
import { OpenF1LiveSessionError } from "@/lib/openf1";
import { getMockDrivers, getMockConstructors } from "@/lib/mock-data";
import { USE_MOCK_DATA } from "@/lib/config";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (USE_MOCK_DATA) {
    return NextResponse.json({ drivers: getMockDrivers(), constructors: getMockConstructors() });
  }

  try {
    const sessionKeyParam = request.nextUrl.searchParams.get("session_key");
    const sessionKey = sessionKeyParam ? parseInt(sessionKeyParam, 10) : undefined;
    if (sessionKey !== undefined && (isNaN(sessionKey) || sessionKey <= 0)) {
      return NextResponse.json({ error: "Invalid session_key" }, { status: 400 });
    }

    const drivers = await analyzeDrivers(sessionKey);
    const constructors = await analyzeConstructors(drivers);

    return NextResponse.json({ drivers, constructors });
  } catch (error) {
    if (error instanceof OpenF1LiveSessionError) {
      return NextResponse.json(
        { error: error.message, code: "LIVE_SESSION" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: `Failed to analyze drivers: ${String(error)}` },
      { status: 500 },
    );
  }
}
