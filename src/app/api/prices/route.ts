import { NextResponse } from "next/server";
import { getFantasyData } from "@/lib/fantasy";

export async function GET(): Promise<NextResponse> {
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
