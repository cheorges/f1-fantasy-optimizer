import { NextResponse } from "next/server";
import { getFantasyData } from "@/lib/fantasy";
import { MOCK_PRICES } from "@/lib/mock-data";
import { USE_MOCK_DATA } from "@/lib/config";
import type { PricesResponse } from "@/lib/api-types";

export async function GET(): Promise<NextResponse> {
  if (USE_MOCK_DATA) {
    return NextResponse.json<PricesResponse>(MOCK_PRICES);
  }

  try {
    const data = await getFantasyData();

    return NextResponse.json<PricesResponse>({
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
