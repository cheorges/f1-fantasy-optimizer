"use client";

import { useMemo, useState } from "react";
import type { DriverAnalysis } from "@/lib/types";
import { formatLapTime, formatPrice, formatPriceChange } from "@/lib/format";
import SortButton from "@/components/SortButton";

type SortField = "bestLapTime" | "price" | "valueScore" | "topSpeed";
type SortDirection = "asc" | "desc";
export type DriverColumn = "sectors" | "topSpeed" | "price" | "laps";

interface DriverTableProps {
  drivers: DriverAnalysis[];
  loading: boolean;
  visibleColumns: Set<DriverColumn>;
}

export const COLUMN_OPTIONS: { key: DriverColumn; label: string }[] = [
  { key: "sectors", label: "S1/S2/S3" },
  { key: "topSpeed", label: "Top Speed" },
  { key: "price", label: "Price" },
  { key: "laps", label: "Laps" },
];

function formatSector(seconds: number | null): string {
  if (seconds === null) return "-";
  return seconds.toFixed(3);
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

export default function DriverTable({ drivers, loading, visibleColumns }: DriverTableProps) {
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

  const show = (col: DriverColumn) => visibleColumns.has(col);

  const sorted = useMemo(() => {
    return [...drivers].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;

      switch (sortField) {
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
  }, [drivers, sortField, sortDirection]);

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
    <>
      {/* Mobile: one row per driver, sorted by tapping a column heading. Heading and rows
          share the column widths so the figures line up. */}
      <div className="sm:hidden">
        <div className="h-8 flex items-center gap-2 border-b border-zinc-800 text-xs text-zinc-500">
          <span className="w-5 shrink-0" />
          <span className="w-[3px] shrink-0" />
          <span className="flex-1 min-w-0">Driver</span>
          <SortButton label="Lap" active={sortField === "bestLapTime"} direction={sortDirection}
            onClick={() => handleSort("bestLapTime")} className="w-[66px] shrink-0 text-right" />
          {show("price") && (
            <SortButton label="Price" active={sortField === "price"} direction={sortDirection}
              onClick={() => handleSort("price")} className="w-[52px] shrink-0 text-right" />
          )}
          {show("topSpeed") && (
            <SortButton label="Speed" active={sortField === "topSpeed"} direction={sortDirection}
              onClick={() => handleSort("topSpeed")} className="w-10 shrink-0 text-right" />
          )}
          <SortButton label="Value" active={sortField === "valueScore"} direction={sortDirection}
            onClick={() => handleSort("valueScore")} className="w-11 shrink-0 text-right" />
        </div>
        <div className="divide-y divide-zinc-800/70">
          {sorted.map((driver, index) => (
            <div key={driver.driverNumber} className="py-1.5">
              <div className="min-h-9 flex items-center gap-2">
                <span className="w-5 shrink-0 text-right font-mono text-xs text-zinc-500">{index + 1}</span>
                <span
                  className="w-[3px] h-[26px] rounded-full shrink-0"
                  style={{ backgroundColor: `#${driver.teamColour}` }}
                />
                <div className="flex-1 min-w-0 leading-tight">
                  <div className="text-sm truncate">
                    {driver.firstName} <span className="font-semibold">{driver.lastName}</span>
                  </div>
                  <div className="text-xs text-zinc-500 truncate">{driver.teamName}</div>
                </div>
                <span className="w-[66px] shrink-0 text-right font-mono text-[13px] tabular-nums">
                  {formatLapTime(driver.bestLapTime)}
                </span>
                {show("price") && (
                  <span className="w-[52px] shrink-0 text-right font-mono text-[13px] tabular-nums leading-tight">
                    {formatPrice(driver.price)}
                    {driver.priceChange !== null && driver.priceChange !== 0 && (
                      <span className={`block text-[11px] ${driver.priceChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {formatPriceChange(driver.priceChange)}
                      </span>
                    )}
                  </span>
                )}
                {show("topSpeed") && (
                  <span className="w-10 shrink-0 text-right font-mono text-[13px] text-zinc-400 tabular-nums">
                    {driver.topSpeed ?? "-"}
                  </span>
                )}
                <span
                  className={`w-11 shrink-0 text-right font-mono text-[13px] font-semibold tabular-nums ${getValueColor(driver.valueScore, allValueScores)}`}
                >
                  {driver.valueScore !== null ? driver.valueScore.toFixed(2) : "-"}
                </span>
              </div>
              {(show("sectors") || show("laps")) && (
                <div className="pl-[39px] mt-0.5 flex gap-3 flex-wrap font-mono text-[11px] text-zinc-500">
                  {show("sectors") && (
                    <span>
                      S1 {formatSector(driver.bestSectors.sector1)} · S2 {formatSector(driver.bestSectors.sector2)} · S3 {formatSector(driver.bestSectors.sector3)}
                    </span>
                  )}
                  {show("laps") && <span>{driver.lapCount} laps</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden sm:block">
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
                  aria-sort={sortField === "bestLapTime" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                >
                  Best Lap{sortIndicator("bestLapTime")}
                </th>
                {show("sectors") && <th className="py-3 px-2">S1</th>}
                {show("sectors") && <th className="py-3 px-2">S2</th>}
                {show("sectors") && <th className="py-3 px-2">S3</th>}
                {show("topSpeed") && (
                  <th
                    className="py-3 px-2 cursor-pointer hover:text-zinc-200"
                    onClick={() => handleSort("topSpeed")}
                    aria-sort={sortField === "topSpeed" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Top Speed{sortIndicator("topSpeed")}
                  </th>
                )}
                {show("price") && (
                  <th
                    className="py-3 px-2 cursor-pointer hover:text-zinc-200"
                    onClick={() => handleSort("price")}
                    aria-sort={sortField === "price" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  >
                    Price{sortIndicator("price")}
                  </th>
                )}
                {show("laps") && <th className="py-3 px-2">Laps</th>}
                <th
                  className="py-3 px-2 cursor-pointer hover:text-zinc-200"
                  onClick={() => handleSort("valueScore")}
                  aria-sort={sortField === "valueScore" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
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
                    {formatLapTime(driver.bestLapTime)}
                  </td>
                  {show("sectors") && (
                    <td className="py-3 px-2 font-mono text-zinc-400">
                      {formatSector(driver.bestSectors.sector1)}
                    </td>
                  )}
                  {show("sectors") && (
                    <td className="py-3 px-2 font-mono text-zinc-400">
                      {formatSector(driver.bestSectors.sector2)}
                    </td>
                  )}
                  {show("sectors") && (
                    <td className="py-3 px-2 font-mono text-zinc-400">
                      {formatSector(driver.bestSectors.sector3)}
                    </td>
                  )}
                  {show("topSpeed") && (
                    <td className="py-3 px-2 font-mono text-zinc-400">
                      {driver.topSpeed !== null ? `${driver.topSpeed}` : "-"}
                    </td>
                  )}
                  {show("price") && (
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
                  )}
                  {show("laps") && (
                    <td className="py-3 px-2 text-zinc-400">{driver.lapCount}</td>
                  )}
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
      </div>
    </>
  );
}
