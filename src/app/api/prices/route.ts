import { NextResponse } from "next/server";
import { getFantasyData } from "@/lib/fantasy";
import { MOCK_PRICES } from "@/lib/mock-data";

export async function GET(): Promise<NextResponse> {
  if (process.env.USE_MOCK_DATA === "true") {
    return NextResponse.json(MOCK_PRICES);
  }

  try {
    const data = await getFantasyData();

    return NextResponse.json({
      drivers: data.drivers,
      constructors: data.constructors,
      round: data.round,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to load prices: ${String(error)}` },
      { status: 500 },
    );
  }
}
