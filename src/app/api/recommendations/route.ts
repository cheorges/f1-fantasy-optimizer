import { type NextRequest, NextResponse } from "next/server";
import { analyzeDrivers, generateRecommendations } from "@/lib/analyzer";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const budgetParam = request.nextUrl.searchParams.get("budget");
    const sessionKey = request.nextUrl.searchParams.get("session_key");

    const budget = budgetParam ? parseFloat(budgetParam) : 0;

    const drivers = await analyzeDrivers(
      sessionKey ? parseInt(sessionKey, 10) : undefined,
    );
    const recommendations = generateRecommendations(drivers, budget);

    return NextResponse.json({ budget, recommendations });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to generate recommendations: ${String(error)}` },
      { status: 500 },
    );
  }
}
