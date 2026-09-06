"use client";

import { useAppData } from "@/components/app-data";
import PriceTable from "@/components/PriceTable";

export default function PricesPage() {
  const { priceDrivers, priceConstructors, priceRound, loadingPrices } = useAppData();

  return (
    <PriceTable
      drivers={priceDrivers}
      constructors={priceConstructors}
      round={priceRound}
      loading={loadingPrices}
    />
  );
}
