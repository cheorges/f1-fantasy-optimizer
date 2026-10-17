"use client";

import { useAppData, isSessionRunning } from "@/components/app-data";
import PriceTable from "@/components/PriceTable";
import StaleDataBanner from "@/components/StaleDataBanner";

export default function PricesPage() {
  const appData = useAppData();
  const { priceDrivers, priceConstructors, priceRound, loadingPrices, stalePrices } = appData;

  return (
    <>
      {stalePrices && (
        <StaleDataBanner
          subject="prices"
          savedAt={stalePrices.savedAt}
          sessionRunning={isSessionRunning(appData)}
          round={priceRound}
        />
      )}
      <PriceTable
        drivers={priceDrivers}
        constructors={priceConstructors}
        loading={loadingPrices}
      />
    </>
  );
}
