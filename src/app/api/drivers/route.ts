import { type NextRequest, NextResponse } from "next/server";
import { analyzeDrivers } from "@/lib/analyzer";
import { getMockDrivers } from "@/lib/mock-data";

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.USE_MOCK_DATA === "true") {
    return NextResponse.json({ drivers: getMockDrivers() });
  }

  try {
    const sessionKeyParam = request.nextUrl.searchParams.get("session_key");
    const sessionKey = sessionKeyParam ? parseInt(sessionKeyParam, 10) : undefined;
    if (sessionKey !== undefined && (isNaN(sessionKey) || sessionKey <= 0)) {
      return NextResponse.json({ error: "Invalid session_key" }, { status: 400 });
    }
    const drivers = await analyzeDrivers(sessionKey);

    return NextResponse.json({ drivers });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to analyze drivers: ${String(error)}` },
      { status: 500 },
    );
  }
}
