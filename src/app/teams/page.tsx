"use client";

import { useAppData, isSessionRunning } from "@/components/app-data";
import TeamTab from "@/components/TeamTab";
import StaleDataBanner from "@/components/StaleDataBanner";

export default function TeamsPage() {
  const appData = useAppData();
  const { priceDrivers, priceConstructors, priceRound, loadingPrices, stalePrices } = appData;

  return (
    <>
      {/* Budgets and upgrades are priced from this data, so a stale copy has to say so here too. */}
      {stalePrices && (
        <StaleDataBanner
          subject="prices"
          savedAt={stalePrices.savedAt}
          sessionRunning={isSessionRunning(appData)}
          round={priceRound}
        />
      )}
      <TeamTab
        drivers={priceDrivers}
        constructors={priceConstructors}
        round={priceRound}
        loading={loadingPrices}
      />
    </>
  );
}
