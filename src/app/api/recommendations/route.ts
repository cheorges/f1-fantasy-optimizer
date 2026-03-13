import { type NextRequest, NextResponse } from "next/server";
import { analyzeDrivers, generateRecommendations, analyzeConstructors, generateConstructorRecommendations } from "@/lib/analyzer";
import { OpenF1LiveSessionError } from "@/lib/openf1";
import { getMockRecommendations } from "@/lib/mock-data";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const budgetParam = request.nextUrl.searchParams.get("budget");
  const budget = budgetParam ? parseFloat(budgetParam) : 0;
  if (isNaN(budget) || budget < 0) {
    return NextResponse.json({ error: "Invalid budget" }, { status: 400 });
  }

  if (process.env.USE_MOCK_DATA === "true") {
    return NextResponse.json(getMockRecommendations(budget));
  }

  try {
    const sessionKeyParam = request.nextUrl.searchParams.get("session_key");
    const sessionKey = sessionKeyParam ? parseInt(sessionKeyParam, 10) : undefined;
    if (sessionKey !== undefined && (isNaN(sessionKey) || sessionKey <= 0)) {
      return NextResponse.json({ error: "Invalid session_key" }, { status: 400 });
    }

    const drivers = await analyzeDrivers(sessionKey);
    const recommendations = generateRecommendations(drivers, budget);

    const constructors = await analyzeConstructors(drivers);
    const constructorRecommendations = generateConstructorRecommendations(constructors, budget);

    return NextResponse.json({ budget, recommendations, constructorRecommendations });
  } catch (error) {
    if (error instanceof OpenF1LiveSessionError) {
      return NextResponse.json(
        { error: error.message, code: "LIVE_SESSION" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: `Failed to generate recommendations: ${String(error)}` },
      { status: 500 },
    );
  }
}
