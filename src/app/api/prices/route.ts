import { NextResponse } from "next/server";
import { getFantasyData } from "@/lib/fantasy";
import { getPriceTrends } from "@/lib/price-trend";
import { MOCK_PRICES } from "@/lib/mock-data";
import { USE_MOCK_DATA } from "@/lib/config";
import type { PricesResponse } from "@/lib/api-types";
import type { PriceTrend } from "@/lib/types";

export async function GET(): Promise<NextResponse> {
  if (USE_MOCK_DATA) {
    return NextResponse.json<PricesResponse>(MOCK_PRICES);
  }

  try {
    const data = await getFantasyData();

    // The trend is a nice-to-have built from extra round fetches. If those fail, serve the
    // prices without it rather than failing the whole page.
    let trends = new Map<number, PriceTrend>();
    try {
      trends = await getPriceTrends(data.round);
    } catch {
      trends = new Map();
    }

    return NextResponse.json<PricesResponse>({
      drivers: data.drivers.map((d) => ({ ...d, trend: trends.get(d.id) ?? null })),
      constructors: data.constructors.map((c) => ({ ...c, trend: trends.get(c.id) ?? null })),
      round: data.round,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to load prices: ${String(error)}` },
      { status: 500 },
    );
  }
}
