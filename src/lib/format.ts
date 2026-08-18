export function formatLapTime(seconds: number | null): string {
  if (seconds === null) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

export function formatPrice(price: number | null): string {
  if (price === null) return "-";
  // Sign before the currency, not after it: a price delta is negative whenever the
  // replacement is cheaper, and "$-5.7M" reads as a typo.
  const sign = price < 0 ? "-" : "";
  return `${sign}$${Math.abs(price).toFixed(1)}M`;
}

// When cached data is being shown, the reader needs to know how old it is. Same day shows
// the time only; anything older carries its date, so "yesterday's FP1" can't read as current.
export function formatCachedAt(timestamp: number): string {
  const saved = new Date(timestamp);
  const now = new Date();
  const sameDay =
    saved.getFullYear() === now.getFullYear() &&
    saved.getMonth() === now.getMonth() &&
    saved.getDate() === now.getDate();

  const time = saved.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return time;

  return `${saved.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}, ${time}`;
}

export function formatPriceChange(change: number | null): string {
  if (change === null || change === 0) return "-";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}M`;
}
