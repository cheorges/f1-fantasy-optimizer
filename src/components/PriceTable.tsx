"use client";

import { useMemo, useState } from "react";
import type { FantasyDriver, FantasyConstructor, PriceTrend } from "@/lib/types";
import { formatPrice, formatPriceChange } from "@/lib/format";
import CollapsibleSection from "@/components/CollapsibleSection";

const TREND_INFO = "Trend is an estimate, not a forecast. The Fantasy feed publishes no transfer numbers, so it is derived from how the price and the ownership percentage have moved over the last three rounds. It reads as stable when the two disagree, or when neither has moved. One of them standing still does not cancel the other — ownership is published as a whole percent, so small shifts show up as no change.";

const TREND_DISPLAY: Record<PriceTrend, { symbol: string; label: string; className: string }> = {
  up: { symbol: "↑", label: "Rising", className: "text-emerald-400" },
  down: { symbol: "↓", label: "Falling", className: "text-red-400" },
  flat: { symbol: "→", label: "Stable", className: "text-zinc-500" },
};

function TrendCell({ trend, compact = false }: { trend: PriceTrend | null; compact?: boolean }) {
  if (trend === null) {
    return <span className="text-zinc-600" title="Not enough round history yet">&#8212;</span>;
  }
  const { symbol, label, className } = TREND_DISPLAY[trend];
  return (
    <span className={className} title={label}>
      {symbol}
      {!compact && <span className="ml-1 text-xs">{label}</span>}
    </span>
  );
}

type DriverSortField = "price" | "priceChange" | "selectedPercentage" | "overallPoints";
type ConstructorSortField = "price" | "priceChange" | "selectedPercentage" | "overallPoints";
type SortDirection = "asc" | "desc";

interface PriceTableProps {
  drivers: FantasyDriver[];
  constructors: FantasyConstructor[];
  round: number;
  loading: boolean;
}

function priceChangeColor(change: number): string {
  if (change > 0) return "text-emerald-400";
  if (change < 0) return "text-red-400";
  return "text-zinc-500";
}

function useSortable<T>(
  items: T[],
  defaultField: keyof T & string,
  defaultDir: SortDirection = "desc",
) {
  const [sortField, setSortField] = useState<keyof T & string>(defaultField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDir);

  function handleSort(field: keyof T & string) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === "number" && typeof bVal === "number") return (aVal - bVal) * dir;
      return 0;
    });
  }, [items, sortField, sortDirection]);

  const indicator = (field: keyof T & string) => {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? " \u2191" : " \u2193";
  };

  return { sorted, handleSort, indicator, sortField };
}

function DriverPriceSection({ drivers }: { drivers: FantasyDriver[] }) {
  const { sorted, handleSort, indicator, sortField } = useSortable(drivers, "price");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <CollapsibleSection
      title="Driver Prices"
      info={`All prices come from the official F1 Fantasy game feed. Price changes show the difference to the previous round. 'Selected' shows how many fantasy players have picked this driver. Points are the total F1 Fantasy points earned this season. ${TREND_INFO}`}
      collapsed={collapsed}
      onToggle={() => setCollapsed((v) => !v)}
      headerRight={<span className="text-xs text-zinc-500">{drivers.length} drivers</span>}
    >
      {/* Mobile: Card layout */}
      <div className="sm:hidden">
        <div className="px-3 py-2 flex gap-2 flex-wrap border-b border-zinc-800">
          {(["price", "priceChange", "selectedPercentage", "overallPoints"] as DriverSortField[]).map((field) => {
            const labels: Record<DriverSortField, string> = {
              price: "Price",
              priceChange: "Change",
              selectedPercentage: "Selected",
              overallPoints: "Points",
            };
            return (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={`min-h-[44px] px-3 rounded-full text-xs font-medium transition-colors ${
                  sortField === field
                    ? "bg-red-600 text-white"
                    : "bg-zinc-800 text-zinc-400 active:bg-zinc-700"
                }`}
              >
                {labels[field]}{indicator(field)}
              </button>
            );
          })}
        </div>
        <div className="divide-y divide-zinc-800/50">
          {sorted.map((driver) => (
            <div key={driver.id} className="px-3 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <div className="truncate">
                  <span className="font-medium">{driver.firstName} </span>
                  <span className="font-bold">{driver.lastName}</span>
                </div>
                <span className="text-xs text-zinc-500 shrink-0">{driver.teamName}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-mono font-semibold">{formatPrice(driver.price)}</span>
                <span className={`font-mono text-xs ${priceChangeColor(driver.priceChange)}`}>
                  {formatPriceChange(driver.priceChange)}
                </span>
                <span className="text-sm"><TrendCell trend={driver.trend} compact /></span>
                <span className="text-xs text-zinc-400">{driver.selectedPercentage.toFixed(1)}%</span>
                <span className="text-xs text-zinc-400">{driver.overallPoints} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Table layout (drivers) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-left">
              <th className="py-3 px-3">Driver</th>
              <th className="py-3 px-3">Team</th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-zinc-200"
                onClick={() => handleSort("price")}
              >
                Price{indicator("price")}
              </th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-zinc-200"
                onClick={() => handleSort("priceChange")}
              >
                Change{indicator("priceChange")}
              </th>
              <th className="py-3 px-3">Trend</th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-zinc-200"
                onClick={() => handleSort("selectedPercentage")}
              >
                Selected{indicator("selectedPercentage")}
              </th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-zinc-200"
                onClick={() => handleSort("overallPoints")}
              >
                Points{indicator("overallPoints")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((driver) => (
              <tr
                key={driver.id}
                className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
              >
                <td className="py-3 px-3">
                  <span className="font-medium">{driver.firstName} </span>
                  <span className="font-bold">{driver.lastName}</span>
                </td>
                <td className="py-3 px-3 text-zinc-400">{driver.teamName}</td>
                <td className="py-3 px-3 font-mono font-semibold">{formatPrice(driver.price)}</td>
                <td className={`py-3 px-3 font-mono ${priceChangeColor(driver.priceChange)}`}>
                  {formatPriceChange(driver.priceChange)}
                </td>
                <td className="py-3 px-3 whitespace-nowrap"><TrendCell trend={driver.trend} /></td>
                <td className="py-3 px-3 text-zinc-400">{driver.selectedPercentage.toFixed(1)}%</td>
                <td className="py-3 px-3 font-mono">{driver.overallPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}

function ConstructorPriceSection({ constructors }: { constructors: FantasyConstructor[] }) {
  const { sorted, handleSort, indicator, sortField } = useSortable(constructors, "price");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <CollapsibleSection
      title="Constructor Prices"
      info={`All prices come from the official F1 Fantasy game feed. Price changes show the difference to the previous round. 'Selected' shows how many fantasy players have picked this constructor. Points are the total F1 Fantasy points earned this season. ${TREND_INFO}`}
      collapsed={collapsed}
      onToggle={() => setCollapsed((v) => !v)}
      headerRight={<span className="text-xs text-zinc-500">{constructors.length} constructors</span>}
    >
      {/* Mobile: Card layout */}
      <div className="sm:hidden">
        <div className="px-3 py-2 flex gap-2 flex-wrap border-b border-zinc-800">
          {(["price", "priceChange", "selectedPercentage", "overallPoints"] as ConstructorSortField[]).map((field) => {
            const labels: Record<ConstructorSortField, string> = {
              price: "Price",
              priceChange: "Change",
              selectedPercentage: "Selected",
              overallPoints: "Points",
            };
            return (
              <button
                key={field}
                onClick={() => handleSort(field)}
                className={`min-h-[44px] px-3 rounded-full text-xs font-medium transition-colors ${
                  sortField === field
                    ? "bg-red-600 text-white"
                    : "bg-zinc-800 text-zinc-400 active:bg-zinc-700"
                }`}
              >
                {labels[field]}{indicator(field)}
              </button>
            );
          })}
        </div>
        <div className="divide-y divide-zinc-800/50">
          {sorted.map((constructor) => (
            <div key={constructor.id} className="px-3 py-3">
              <div className="font-bold truncate">{constructor.name}</div>
              <div className="mt-1.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-mono font-semibold">{formatPrice(constructor.price)}</span>
                <span className={`font-mono text-xs ${priceChangeColor(constructor.priceChange)}`}>
                  {formatPriceChange(constructor.priceChange)}
                </span>
                <span className="text-sm"><TrendCell trend={constructor.trend} compact /></span>
                <span className="text-xs text-zinc-400">{constructor.selectedPercentage.toFixed(1)}%</span>
                <span className="text-xs text-zinc-400">{constructor.overallPoints} pts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 text-left">
              <th className="py-3 px-3">Constructor</th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-zinc-200"
                onClick={() => handleSort("price")}
              >
                Price{indicator("price")}
              </th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-zinc-200"
                onClick={() => handleSort("priceChange")}
              >
                Change{indicator("priceChange")}
              </th>
              <th className="py-3 px-3">Trend</th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-zinc-200"
                onClick={() => handleSort("selectedPercentage")}
              >
                Selected{indicator("selectedPercentage")}
              </th>
              <th
                className="py-3 px-3 cursor-pointer hover:text-zinc-200"
                onClick={() => handleSort("overallPoints")}
              >
                Points{indicator("overallPoints")}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((constructor) => (
              <tr
                key={constructor.id}
                className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
              >
                <td className="py-3 px-3 font-bold">{constructor.name}</td>
                <td className="py-3 px-3 font-mono font-semibold">{formatPrice(constructor.price)}</td>
                <td className={`py-3 px-3 font-mono ${priceChangeColor(constructor.priceChange)}`}>
                  {formatPriceChange(constructor.priceChange)}
                </td>
                <td className="py-3 px-3 whitespace-nowrap"><TrendCell trend={constructor.trend} /></td>
                <td className="py-3 px-3 text-zinc-400">{constructor.selectedPercentage.toFixed(1)}%</td>
                <td className="py-3 px-3 font-mono">{constructor.overallPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CollapsibleSection>
  );
}

export default function PriceTable({ drivers, constructors, round, loading }: PriceTableProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
        <span className="ml-3 text-zinc-400">Loading prices...</span>
      </div>
    );
  }

  if (drivers.length === 0 && constructors.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        No price data available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-200">Fantasy Prices</span>
        <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">Round {round}</span>
      </div>
      <DriverPriceSection drivers={drivers} />
      <ConstructorPriceSection constructors={constructors} />
    </div>
  );
}
