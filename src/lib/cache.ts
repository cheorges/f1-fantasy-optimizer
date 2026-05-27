const DEFAULT_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const MAX_CACHE_ENTRIES = 100;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();

// Drops every entry whose TTL has already elapsed. Expired entries linger until read
// (getCached purges lazily), so sweep them before enforcing the size cap.
function purgeExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
}

// Evicts the entry closest to expiry (not true LRU — reads don't refresh recency).
function evictSoonestToExpire(): void {
  let soonestKey: string | null = null;
  let soonestTime = Infinity;

  for (const [key, entry] of store) {
    if (entry.expiresAt < soonestTime) {
      soonestTime = entry.expiresAt;
      soonestKey = key;
    }
  }

  if (soonestKey) store.delete(soonestKey);
}

export function clearCache(): void {
  store.clear();
}

export function getCached<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }

  return entry.data;
}

export function setCache<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  if (store.size >= MAX_CACHE_ENTRIES && !store.has(key)) {
    purgeExpired();
    if (store.size >= MAX_CACHE_ENTRIES) evictSoonestToExpire();
  }

  store.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function getOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached !== null) return cached;

  const data = await fetcher();
  setCache(key, data, ttlMs);
  return data;
}
