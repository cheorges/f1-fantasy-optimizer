// Last-known-good responses kept in the browser, so a blocked upstream shows stale data
// instead of an empty page. Only used for the OpenF1-backed endpoints — see price-trend.ts
// and fantasy.ts for the server-side cache, which is a different thing entirely.

const PREFIX = "f1-cache";

// Bump when a cached response shape changes. Old entries keep their old prefix and are
// simply never read again, so a stale shape can't reach the UI.
const VERSION = 1;

export interface CachedEntry<T> {
  savedAt: number;
  data: T;
}

function storageKey(key: string): string {
  return `${PREFIX}:v${VERSION}:${key}`;
}

function clearOurKeys(): void {
  const doomed: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(`${PREFIX}:`)) doomed.push(key);
  }
  for (const key of doomed) localStorage.removeItem(key);
}

/**
 * Returns the cached entry, or null if there is nothing usable. `isValid` is the caller's
 * own shape check — anything that fails it is treated as absent rather than trusted.
 */
export function readCache<T>(key: string, isValid: (data: unknown) => data is T): CachedEntry<T> | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;

    const entry = parsed as Record<string, unknown>;
    if (typeof entry.savedAt !== "number" || !isValid(entry.data)) return null;

    return { savedAt: entry.savedAt, data: entry.data };
  } catch {
    return null;
  }
}

export function writeCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({ savedAt: Date.now(), data });

  try {
    localStorage.setItem(storageKey(key), payload);
  } catch {
    // Out of quota, or a previous version left entries behind. Dropping our own keys and
    // retrying once handles both; if it still fails, going without a cache is acceptable.
    try {
      clearOurKeys();
      localStorage.setItem(storageKey(key), payload);
    } catch {
      // no cache this time
    }
  }
}
