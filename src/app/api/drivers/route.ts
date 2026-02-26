import { type NextRequest, NextResponse } from "next/server";
import { analyzeDrivers } from "@/lib/analyzer";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionKey = request.nextUrl.searchParams.get("session_key");
    const drivers = await analyzeDrivers(
      sessionKey ? parseInt(sessionKey, 10) : undefined,
    );

    return NextResponse.json({ drivers });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to analyze drivers: ${String(error)}` },
      { status: 500 },
    );
  }
}
