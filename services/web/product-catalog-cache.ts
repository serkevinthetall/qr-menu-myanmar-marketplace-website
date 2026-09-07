import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchProductsPage } from '@/services/products';
import { Product } from '@/types/product';
import { mergeById } from '@/utils/quotation-builder-cache';

const STORAGE_KEY = '@qr_shop_web_product_catalog_v5';
/** First paint targets this many rows; the rest load in the background. */
const PAGE_SIZE = 200;
const FRESH_MS = 30 * 60 * 1000;

export type WebProductCatalog = {
  products: Product[];
  updatedAt: number;
  complete: boolean;
};

type Listener = (catalog: WebProductCatalog) => void;

let memory: WebProductCatalog | null = null;
/** Full catalog job (first page + remaining). */
let inflight: Promise<WebProductCatalog> | null = null;
const listeners = new Set<Listener>();

function emit(next: WebProductCatalog) {
  memory = next;
  for (const listener of listeners) {
    listener(next);
  }
}

async function persist(catalog: WebProductCatalog) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    // best-effort
  }
}

async function readDisk(): Promise<WebProductCatalog | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WebProductCatalog;
    if (!parsed || !Array.isArray(parsed.products)) return null;
    return {
      products: parsed.products,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      complete: Boolean(parsed.complete),
    };
  } catch {
    return null;
  }
}

export function getWebProductCatalog(): WebProductCatalog | null {
  return memory;
}

export function subscribeWebProductCatalog(listener: Listener): () => void {
  listeners.add(listener);
  if (memory) listener(memory);
  return () => {
    listeners.delete(listener);
  };
}

export function clearWebProductCatalog() {
  memory = null;
  inflight = null;
  void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
}

export function filterWebProducts(
  products: Product[],
  options?: { q?: string },
): Product[] {
  const q = String(options?.q ?? '')
    .trim()
    .toLowerCase();
  const filtered = !q
    ? products
    : products.filter(
        item =>
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q),
      );
  // Favorites first (same idea as Odoo priority sort).
  return [...filtered].sort((a, b) => {
    const fav = Number(Boolean(b.favorite)) - Number(Boolean(a.favorite));
    if (fav !== 0) return fav;
    return a.name.localeCompare(b.name);
  });
}

/** Optimistically patch a product's favorite flag in the in-memory catalog. */
export function patchWebProductFavorite(id: string, favorite: boolean) {
  if (!memory) return;
  const products = memory.products.map(p =>
    p.id === id ? { ...p, favorite } : p,
  );
  const next: WebProductCatalog = {
    ...memory,
    products,
    updatedAt: Date.now(),
  };
  emit(next);
  void persist(next);
}

/** Optimistically patch a product's sales price in the in-memory catalog. */
export function patchWebProductPrice(id: string, price: number) {
  if (!memory) return;
  const products = memory.products.map(p =>
    p.id === id ? { ...p, price } : p,
  );
  const next: WebProductCatalog = {
    ...memory,
    products,
    updatedAt: Date.now(),
  };
  emit(next);
  void persist(next);
}

async function fetchRemainingPages(
  token: string,
  seed: Product[],
): Promise<WebProductCatalog> {
  let products = seed;
  let offset = seed.length;
  let hasMore = true;

  while (hasMore) {
    const page = await fetchProductsPage(token, {
      limit: PAGE_SIZE,
      offset,
    });
    products = mergeById(products, page.data);
    offset += page.data.length;
    hasMore = page.hasMore && page.data.length > 0;
    emit({
      products,
      updatedAt: Date.now(),
      complete: !hasMore,
    });
    if (page.data.length === 0) break;
  }

  const finalCatalog: WebProductCatalog = {
    products,
    updatedAt: Date.now(),
    complete: true,
  };
  emit(finalCatalog);
  await persist(finalCatalog);
  return finalCatalog;
}

/**
 * Load the full catalog from Odoo. Emits after the first page and after each
 * following page so the UI can paint early.
 */
async function fetchAllPages(token: string): Promise<WebProductCatalog> {
  const first = await fetchProductsPage(token, {
    limit: PAGE_SIZE,
    offset: 0,
  });
  const firstCatalog: WebProductCatalog = {
    products: first.data,
    updatedAt: Date.now(),
    complete: !first.hasMore,
  };
  emit(firstCatalog);

  if (!first.hasMore) {
    await persist(firstCatalog);
    return firstCatalog;
  }

  return fetchRemainingPages(token, first.data);
}

function startBackgroundCatalogLoad(token: string): Promise<WebProductCatalog> {
  if (inflight) return inflight;
  inflight = fetchAllPages(token)
    .catch(error => {
      if (memory) return memory;
      throw error;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Progressive product catalog for website Products + Quotation Builder.
 *
 * - Returns as soon as the first ~200 products are available (or disk cache).
 * - Continues loading remaining pages in the background and emits updates.
 */
export async function ensureWebProductCatalog(
  token: string,
  options?: { force?: boolean },
): Promise<WebProductCatalog> {
  if (!memory) {
    const disk = await readDisk();
    if (disk && disk.products.length > 0) {
      emit(disk);
    }
  }

  // Fresh complete cache — use it; optionally refresh later if stale.
  if (!options?.force && memory?.complete) {
    const age = Date.now() - memory.updatedAt;
    if (age < FRESH_MS) {
      return memory;
    }
    void startBackgroundCatalogLoad(token);
    return memory;
  }

  // Incomplete cache — show it and finish remaining pages in background.
  if (
    !options?.force &&
    memory &&
    !memory.complete &&
    memory.products.length > 0
  ) {
    if (!inflight) {
      inflight = fetchRemainingPages(token, memory.products)
        .catch(() => memory!)
        .finally(() => {
          inflight = null;
        });
    }
    return memory;
  }

  // Force refresh with something already on screen — don't blank the UI.
  if (options?.force && memory && memory.products.length > 0) {
    void startBackgroundCatalogLoad(token);
    return memory;
  }

  // Cold start: wait only for the first page, then keep loading behind.
  const job = startBackgroundCatalogLoad(token);

  // Wait until memory has the first page (emit inside fetchAllPages).
  if (memory && memory.products.length > 0) {
    return memory;
  }

  // Poll via the same job: after first emit, memory is set; we still need to
  // wait for that first emit before returning on a true cold start.
  await new Promise<void>((resolve, reject) => {
    if (memory && memory.products.length > 0) {
      resolve();
      return;
    }
    const unsub = subscribeWebProductCatalog(catalog => {
      if (catalog.products.length > 0 || catalog.complete) {
        unsub();
        resolve();
      }
    });
    job.catch(err => {
      unsub();
      reject(err);
    });
  });

  return memory ?? (await job);
}
