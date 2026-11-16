const VERSION = 1;
const ROOT_KEY = `neoai-repertory-swr-v${VERSION}`;
const MAX_BYTES = 2_000_000;
const MAX_ENTRIES = 60;

type Entry = { ts: number; bytes: number; data: unknown };
type Store = { entries: Record<string, Entry>; order: string[] };

function emptyStore(): Store {
  return { entries: {}, order: [] };
}

function readStore(): Store {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(ROOT_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as Store;
    if (!parsed || typeof parsed.entries !== "object" || !Array.isArray(parsed.order)) {
      return emptyStore();
    }
    return parsed;
  } catch {
    return emptyStore();
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROOT_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded: evict half and retry once.
    try {
      const half = Math.max(1, Math.floor(store.order.length / 2));
      for (const key of store.order.slice(0, half)) delete store.entries[key];
      store.order = store.order.slice(half);
      localStorage.setItem(ROOT_KEY, JSON.stringify(store));
    } catch {
      try {
        localStorage.removeItem(ROOT_KEY);
      } catch {
        /* ignore */
      }
    }
  }
}

function totalBytes(store: Store): number {
  let n = 0;
  for (const key of store.order) n += store.entries[key]?.bytes || 0;
  return n;
}

export function peekLocalSwr<T>(key: string): T | null {
  const store = readStore();
  const entry = store.entries[key];
  return entry ? (entry.data as T) : null;
}

export function writeLocalSwr(key: string, data: unknown) {
  if (typeof window === "undefined") return;
  let bytes = 0;
  try {
    bytes = JSON.stringify(data).length;
  } catch {
    return;
  }
  if (bytes > MAX_BYTES) return;

  const store = readStore();
  if (store.entries[key]) {
    store.order = store.order.filter((k) => k !== key);
  }
  store.entries[key] = { ts: Date.now(), bytes, data };
  store.order.push(key);

  while (store.order.length > MAX_ENTRIES || totalBytes(store) > MAX_BYTES) {
    const evict = store.order.shift();
    if (!evict) break;
    delete store.entries[evict];
  }
  writeStore(store);
}

export function swrKeyForEndpoint(endpoint: string): string | null {
  if (endpoint === "/symptoms") return "symptoms-chapters";
  if (endpoint.startsWith("/symptoms/children/")) return `children:${endpoint.slice("/symptoms/children/".length)}`;
  if (endpoint.startsWith("/symptoms/") && !endpoint.startsWith("/symptoms/search")) {
    return `symptom:${endpoint.slice("/symptoms/".length)}`;
  }
  return null;
}
