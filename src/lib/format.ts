export function formatLapTime(seconds: number | null): string {
  if (seconds === null) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toFixed(3).padStart(6, "0")}`;
}

export function formatPrice(price: number | null): string {
  if (price === null) return "-";
  return `$${price.toFixed(1)}M`;
}

export function formatPriceChange(change: number | null): string {
  if (change === null || change === 0) return "-";
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(1)}M`;
}
