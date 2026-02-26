"use client";

import { useState } from "react";
import type { FantasyDriver, FantasyConstructor } from "@/lib/types";

type DriverSortField = "price" | "priceChange" | "selectedPercentage" | "overallPoints";
type ConstructorSortField = "price" | "priceChange" | "selectedPercentage" | "overallPoints";
type SortDirection = "asc" | "desc";

interface PriceTableProps {
  drivers: FantasyDriver[];
  constructors: FantasyConstructor[];
  round: number;
  loading: boolean;
}

function formatPrice(price: number): string {
  return `$${price.toFixed(1)}M`;
}

function formatPriceChange(change: number): string {
  if (change === 0) return "-";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}M`;
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
  const [sortField, setSortField] = useState<string>(defaultField);
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDir);

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  }

  const sorted = [...items].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;
    const aVal = (a as Record<string, unknown>)[sortField] as number;
    const bVal = (b as Record<string, unknown>)[sortField] as number;
    return (aVal - bVal) * dir;
  });

  const indicator = (field: string) => {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? " \u2191" : " \u2193";
  };

  return { sorted, handleSort, indicator, sortField };
}

function DriverPriceSection({ drivers }: { drivers: FantasyDriver[] }) {
  const { sorted, handleSort, indicator, sortField } = useSortable(drivers, "price");

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-3 sm:px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="font-semibold text-zinc-200">Driver Prices</h2>
        <span className="text-xs text-zinc-500">{drivers.length} drivers</span>
      </div>

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
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
                <span className="text-xs text-zinc-400">{driver.selectedPercentage.toFixed(1)}%</span>
                <span className="text-xs text-zinc-400">{driver.overallPoints} pts</span>
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
                <td className="py-3 px-3 text-zinc-400">{driver.selectedPercentage.toFixed(1)}%</td>
                <td className="py-3 px-3 font-mono">{driver.overallPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConstructorPriceSection({ constructors }: { constructors: FantasyConstructor[] }) {
  const { sorted, handleSort, indicator, sortField } = useSortable(constructors, "price");

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-3 sm:px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="font-semibold text-zinc-200">Constructor Prices</h2>
        <span className="text-xs text-zinc-500">{constructors.length} constructors</span>
      </div>

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
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
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
                <td className="py-3 px-3 text-zinc-400">{constructor.selectedPercentage.toFixed(1)}%</td>
                <td className="py-3 px-3 font-mono">{constructor.overallPoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
      <DriverPriceSection drivers={drivers} />
      <ConstructorPriceSection constructors={constructors} />
      <p className="text-center text-xs text-zinc-600">Round {round}</p>
    </div>
  );
}
