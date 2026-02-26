import { type NextRequest, NextResponse } from "next/server";
import { analyzeDrivers, generateRecommendations, analyzeConstructors, generateConstructorRecommendations } from "@/lib/analyzer";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const budgetParam = request.nextUrl.searchParams.get("budget");
    const sessionKey = request.nextUrl.searchParams.get("session_key");

    const budget = budgetParam ? parseFloat(budgetParam) : 0;

    const drivers = await analyzeDrivers(
      sessionKey ? parseInt(sessionKey, 10) : undefined,
    );
    const recommendations = generateRecommendations(drivers, budget);

    const constructors = await analyzeConstructors(drivers);
    const constructorRecommendations = generateConstructorRecommendations(constructors, budget);

    return NextResponse.json({ budget, recommendations, constructorRecommendations });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to generate recommendations: ${String(error)}` },
      { status: 500 },
    );
  }
}
