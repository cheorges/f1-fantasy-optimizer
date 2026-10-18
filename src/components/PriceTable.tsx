"use client";

import { useMemo, useState } from "react";
import type { FantasyDriver, FantasyConstructor, PriceTrend } from "@/lib/types";
import { formatPrice, formatPriceChange } from "@/lib/format";
import SegmentedControl from "@/components/SegmentedControl";
import SortButton from "@/components/SortButton";
import InfoTooltip from "@/components/InfoTooltip";

const TREND_INFO = "Trend is an estimate, not a forecast. The Fantasy feed publishes no transfer numbers, so it is derived from how the price and the ownership percentage have moved over the last three rounds. It reads as stable when the two disagree, or when neither has moved. One of them standing still does not cancel the other — ownership is published as a whole percent, so small shifts show up as no change.";

const DRIVER_INFO = `All prices come from the official F1 Fantasy game feed. Price changes show the difference to the previous round. 'Selected' shows how many fantasy players have picked this driver. Points are the total F1 Fantasy points earned this season. ${TREND_INFO}`;
const CONSTRUCTOR_INFO = `All prices come from the official F1 Fantasy game feed. Price changes show the difference to the previous round. 'Selected' shows how many fantasy players have picked this constructor. Points are the total F1 Fantasy points earned this season. ${TREND_INFO}`;

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

type SortDirection = "asc" | "desc";

interface PriceTableProps {
  drivers: FantasyDriver[];
  constructors: FantasyConstructor[];
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

  return { sorted, handleSort, indicator, sortField, sortDirection };
}

type PriceSortField = "price" | "priceChange" | "selectedPercentage" | "overallPoints";

// Heading for the phone list. Same column widths as PriceRow below.
function PriceHeading({ nameLabel, sortField, sortDirection, onSort }: {
  nameLabel: string;
  sortField: string;
  sortDirection: SortDirection;
  onSort: (field: PriceSortField) => void;
}) {
  const sortButton = (field: PriceSortField, label: string, width: string) => (
    <SortButton label={label} active={sortField === field} direction={sortDirection}
      onClick={() => onSort(field)} className={`${width} shrink-0 text-right`} />
  );
  return (
    <div className="h-8 flex items-center gap-2 border-b border-zinc-800 text-xs text-zinc-500">
      <span className="flex-1 min-w-0">{nameLabel}</span>
      {sortButton("price", "Price", "w-14")}
      {sortButton("priceChange", "Chg", "w-10")}
      <span className="w-4 shrink-0" />
      {sortButton("selectedPercentage", "Sel", "w-9")}
      {sortButton("overallPoints", "Pts", "w-9")}
    </div>
  );
}

function PriceRow({ name, sub, item }: {
  name: React.ReactNode;
  sub?: string;
  item: FantasyDriver | FantasyConstructor;
}) {
  return (
    <div className="min-h-12 py-1.5 flex items-center gap-2">
      <div className="flex-1 min-w-0 leading-tight">
        <div className="text-sm truncate">{name}</div>
        {sub && <div className="text-xs text-zinc-500 truncate">{sub}</div>}
      </div>
      <span className="w-14 shrink-0 text-right font-mono text-[13px] tabular-nums">{formatPrice(item.price)}</span>
      <span className={`w-10 shrink-0 text-right font-mono text-xs tabular-nums ${priceChangeColor(item.priceChange)}`}>
        {formatPriceChange(item.priceChange)}
      </span>
      <span className="w-4 shrink-0 text-center text-[13px]"><TrendCell trend={item.trend} compact /></span>
      {/* Whole percent: the feed publishes ownership that way, the decimal is always .0 there. */}
      <span className="w-9 shrink-0 text-right font-mono text-xs text-zinc-400 tabular-nums">{item.selectedPercentage.toFixed(0)}%</span>
      <span className="w-9 shrink-0 text-right font-mono text-[13px] tabular-nums">{item.overallPoints}</span>
    </div>
  );
}

function DriverPriceSection({ drivers }: { drivers: FantasyDriver[] }) {
  const { sorted, handleSort, indicator, sortField, sortDirection } = useSortable(drivers, "price");

  return (
    <div>
      <div className="sm:hidden">
        <PriceHeading nameLabel="Driver" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
        <div className="divide-y divide-zinc-800/70">
          {sorted.map((driver) => (
            <PriceRow
              key={driver.id}
              name={<>{driver.firstName} <span className="font-semibold">{driver.lastName}</span></>}
              sub={driver.teamName}
              item={driver}
            />
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
    </div>
  );
}

function ConstructorPriceSection({ constructors }: { constructors: FantasyConstructor[] }) {
  const { sorted, handleSort, indicator, sortField, sortDirection } = useSortable(constructors, "price");

  return (
    <div>
      <div className="sm:hidden">
        <PriceHeading nameLabel="Constructor" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
        <div className="divide-y divide-zinc-800/70">
          {sorted.map((constructor) => (
            <PriceRow key={constructor.id} name={<span className="font-semibold">{constructor.name}</span>} item={constructor} />
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
    </div>
  );
}

export default function PriceTable({ drivers, constructors, loading }: PriceTableProps) {
  // One list at a time: stacked, the two came to almost 2800px on a phone.
  const [tab, setTab] = useState<"drivers" | "constructors">("drivers");

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
    <section className="flex flex-col gap-2">
      <div className="flex items-center">
        <SegmentedControl
          ariaLabel="Price list"
          className="flex-1 sm:flex-none sm:w-80"
          options={[
            { value: "drivers", label: `Drivers (${drivers.length})` },
            { value: "constructors", label: `Constructors (${constructors.length})` },
          ]}
          value={tab}
          onChange={setTab}
        />
        <InfoTooltip text={tab === "drivers" ? DRIVER_INFO : CONSTRUCTOR_INFO} />
      </div>
      {tab === "drivers"
        ? <DriverPriceSection drivers={drivers} />
        : <ConstructorPriceSection constructors={constructors} />}
    </section>
  );
}
