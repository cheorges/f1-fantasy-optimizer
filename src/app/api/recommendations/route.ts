import { type NextRequest, NextResponse } from "next/server";
import { analyzeDrivers, generateRecommendations, analyzeConstructors, generateConstructorRecommendations } from "@/lib/analyzer";
import { getMockRecommendations } from "@/lib/mock-data";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const budgetParam = request.nextUrl.searchParams.get("budget");
  const budget = budgetParam ? parseFloat(budgetParam) : 0;

  if (process.env.USE_MOCK_DATA === "true") {
    return NextResponse.json(getMockRecommendations(budget));
  }

  try {
    const sessionKey = request.nextUrl.searchParams.get("session_key");

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
