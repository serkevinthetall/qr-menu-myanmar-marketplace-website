import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppProduct, fetchAppProducts } from '@/services/app/products';

const STORAGE_KEY = '@qr_shop_app_product_catalog_v1';
const PAGE_SIZE = 200;
/** Reuse disk/memory catalog this long before a silent background refresh. */
const FRESH_MS = 30 * 60 * 1000;

export type AppProductCatalog = {
  products: AppProduct[];
  categories: string[];
  updatedAt: number;
  /** True once every page has been fetched (or a complete snapshot was restored). */
  complete: boolean;
};

type Listener = (catalog: AppProductCatalog) => void;

let memory: AppProductCatalog | null = null;
let inflight: Promise<AppProductCatalog> | null = null;
const listeners = new Set<Listener>();

function categoriesFrom(products: AppProduct[]): string[] {
  return Array.from(
    new Set(products.map(item => item.category).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
}

function mergeById(existing: AppProduct[], incoming: AppProduct[]): AppProduct[] {
  if (incoming.length === 0) return existing;
  const map = new Map(existing.map(item => [item.id, item]));
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

function emit(next: AppProductCatalog) {
  memory = next;
  for (const listener of listeners) {
    listener(next);
  }
}

async function persist(catalog: AppProductCatalog) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    // Disk cache is best-effort.
  }
}

async function readDisk(): Promise<AppProductCatalog | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppProductCatalog;
    if (!parsed || !Array.isArray(parsed.products)) return null;
    return {
      products: parsed.products,
      categories: Array.isArray(parsed.categories)
        ? parsed.categories
        : categoriesFrom(parsed.products),
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      complete: Boolean(parsed.complete),
    };
  } catch {
    return null;
  }
}

export function getAppProductCatalog(): AppProductCatalog | null {
  return memory;
}

export function subscribeAppProductCatalog(listener: Listener): () => void {
  listeners.add(listener);
  if (memory) listener(memory);
  return () => {
    listeners.delete(listener);
  };
}

export function clearAppProductCatalog() {
  memory = null;
  inflight = null;
  void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
}

export function filterAppProducts(
  products: AppProduct[],
  options?: { q?: string; category?: string },
): AppProduct[] {
  const q = String(options?.q ?? '')
    .trim()
    .toLowerCase();
  const category = String(options?.category ?? '').trim();

  return products.filter(item => {
    if (category && item.category !== category) return false;
    if (!q) return true;
    const hay = `${item.name} ${item.sku}`.toLowerCase();
    return hay.includes(q);
  });
}

async function fetchAllPages(
  token: string,
  seed: AppProduct[] = [],
): Promise<AppProductCatalog> {
  let products = seed;
  let offset = seed.length;
  let hasMore = true;

  // First page (or continue from seed length when refreshing empty).
  if (seed.length === 0) {
    const first = await fetchAppProducts(token, {
      limit: PAGE_SIZE,
      offset: 0,
    });
    products = first.products;
    offset = first.products.length;
    hasMore = first.hasMore;
    emit({
      products,
      categories: categoriesFrom(products),
      updatedAt: Date.now(),
      complete: !hasMore,
    });
  }

  while (hasMore) {
    const page = await fetchAppProducts(token, {
      limit: PAGE_SIZE,
      offset,
    });
    products = mergeById(products, page.products);
    offset += page.products.length;
    hasMore = page.hasMore && page.products.length > 0;
    emit({
      products,
      categories: categoriesFrom(products),
      updatedAt: Date.now(),
      complete: !hasMore,
    });
    if (page.products.length === 0) break;
  }

  const finalCatalog: AppProductCatalog = {
    products,
    categories: categoriesFrom(products),
    updatedAt: Date.now(),
    complete: true,
  };
  emit(finalCatalog);
  await persist(finalCatalog);
  return finalCatalog;
}

/**
 * Show cached products immediately, then finish loading remaining pages
 * in the background. Search/filter should use the in-memory catalog —
 * not hit the API per keystroke.
 */
export async function ensureAppProductCatalog(
  token: string,
  options?: { force?: boolean },
): Promise<AppProductCatalog> {
  if (!memory) {
    const disk = await readDisk();
    if (disk && disk.products.length > 0) {
      emit(disk);
    }
  }

  if (!options?.force && memory?.complete) {
    const age = Date.now() - memory.updatedAt;
    if (age < FRESH_MS) {
      return memory;
    }
    // Stale but usable — refresh in background without blocking UI.
    if (!inflight) {
      inflight = fetchAllPages(token, [])
        .catch(() => memory!)
        .finally(() => {
          inflight = null;
        });
    }
    return memory;
  }

  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      if (options?.force) {
        return await fetchAllPages(token, []);
      }
      if (memory && !memory.complete && memory.products.length > 0) {
        return await fetchAllPages(token, memory.products);
      }
      return await fetchAllPages(token, []);
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
