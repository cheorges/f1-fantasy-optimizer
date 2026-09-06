"use client";

import { useAppData } from "@/components/app-data";
import TeamTab from "@/components/TeamTab";

export default function TeamsPage() {
  const { priceDrivers, priceConstructors, priceRound, loadingPrices } = useAppData();

  return (
    <TeamTab
      drivers={priceDrivers}
      constructors={priceConstructors}
      round={priceRound}
      loading={loadingPrices}
    />
  );
}
