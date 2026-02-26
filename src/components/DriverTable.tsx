"use client";

import { useState } from "react";
import type { DriverAnalysis } from "@/lib/types";

type SortField = "position" | "bestLapTime" | "price" | "valueScore" | "topSpeed";
type SortDirection = "asc" | "desc";

interface DriverTableProps {
  drivers: DriverAnalysis[];
  loading: boolean;
}

function formatTime(seconds: number | null): string {
  if (seconds === null) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

function formatSector(seconds: number | null): string {
  if (seconds === null) return "-";
  return seconds.toFixed(3);
}

function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return `$${price.toFixed(1)}M`;
}

function formatPriceChange(change: number | null): string {
  if (change === null || change === 0) return "";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}M`;
}

function getValueColor(valueScore: number | null, allScores: (number | null)[]): string {
  if (valueScore === null) return "text-zinc-500";

  const validScores = allScores.filter((s): s is number => s !== null);
  if (validScores.length === 0) return "text-zinc-300";

  const max = Math.max(...validScores);
  const min = Math.min(...validScores);
  const range = max - min;
  if (range === 0) return "text-zinc-300";

  const normalized = (valueScore - min) / range;
  if (normalized >= 0.7) return "text-emerald-400";
  if (normalized >= 0.4) return "text-yellow-400";
  return "text-red-400";
}

export default function DriverTable({ drivers, loading }: DriverTableProps) {
  const [sortField, setSortField] = useState<SortField>("bestLapTime");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "valueScore" ? "desc" : "asc");
    }
  }

  const sorted = [...drivers].sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;

    switch (sortField) {
      case "position":
        return 0;
      case "bestLapTime": {
        if (a.bestLapTime === null) return 1;
        if (b.bestLapTime === null) return -1;
        return (a.bestLapTime - b.bestLapTime) * dir;
      }
      case "price": {
        if (a.price === null) return 1;
        if (b.price === null) return -1;
        return (a.price - b.price) * dir;
      }
      case "valueScore": {
        if (a.valueScore === null) return 1;
        if (b.valueScore === null) return -1;
        return (a.valueScore - b.valueScore) * dir;
      }
      case "topSpeed": {
        if (a.topSpeed === null) return 1;
        if (b.topSpeed === null) return -1;
        return (a.topSpeed - b.topSpeed) * dir;
      }
    }
  });

  const allValueScores = drivers.map((d) => d.valueScore);
  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return "";
    return sortDirection === "asc" ? " \u2191" : " \u2193";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-600 border-t-transparent" />
        <span className="ml-3 text-zinc-400">Loading driver data...</span>
      </div>
    );
  }

  if (drivers.length === 0) {
    return (
      <div className="text-center py-16 text-zinc-500">
        Select a practice session to view driver data
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400 text-left">
            <th className="py-3 px-2 w-8">#</th>
            <th className="py-3 px-2">Driver</th>
            <th className="py-3 px-2">Team</th>
            <th
              className="py-3 px-2 cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort("bestLapTime")}
            >
              Best Lap{sortIndicator("bestLapTime")}
            </th>
            <th className="py-3 px-2 hidden md:table-cell">S1</th>
            <th className="py-3 px-2 hidden md:table-cell">S2</th>
            <th className="py-3 px-2 hidden md:table-cell">S3</th>
            <th
              className="py-3 px-2 hidden sm:table-cell cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort("topSpeed")}
            >
              Top Speed{sortIndicator("topSpeed")}
            </th>
            <th
              className="py-3 px-2 cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort("price")}
            >
              Price{sortIndicator("price")}
            </th>
            <th
              className="py-3 px-2 cursor-pointer hover:text-zinc-200"
              onClick={() => handleSort("valueScore")}
            >
              Value{sortIndicator("valueScore")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((driver, index) => (
            <tr
              key={driver.driverNumber}
              className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
            >
              <td className="py-3 px-2 text-zinc-500">{index + 1}</td>
              <td className="py-3 px-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ backgroundColor: `#${driver.teamColour}` }}
                  />
                  <div>
                    <span className="font-medium">{driver.firstName} </span>
                    <span className="font-bold">{driver.lastName}</span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-2 text-zinc-400">{driver.teamName}</td>
              <td className="py-3 px-2 font-mono">
                {formatTime(driver.bestLapTime)}
              </td>
              <td className="py-3 px-2 font-mono text-zinc-400 hidden md:table-cell">
                {formatSector(driver.bestSectors.sector1)}
              </td>
              <td className="py-3 px-2 font-mono text-zinc-400 hidden md:table-cell">
                {formatSector(driver.bestSectors.sector2)}
              </td>
              <td className="py-3 px-2 font-mono text-zinc-400 hidden md:table-cell">
                {formatSector(driver.bestSectors.sector3)}
              </td>
              <td className="py-3 px-2 font-mono text-zinc-400 hidden sm:table-cell">
                {driver.topSpeed !== null ? `${driver.topSpeed}` : "-"}
              </td>
              <td className="py-3 px-2">
                <span className="font-mono">{formatPrice(driver.price)}</span>
                {driver.priceChange !== null && driver.priceChange !== 0 && (
                  <span
                    className={`ml-1 text-xs ${
                      driver.priceChange > 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatPriceChange(driver.priceChange)}
                  </span>
                )}
              </td>
              <td
                className={`py-3 px-2 font-mono font-bold ${getValueColor(driver.valueScore, allValueScores)}`}
              >
                {driver.valueScore !== null
                  ? driver.valueScore.toFixed(2)
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
