import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchProductsPage } from '@/services/products';
import { Product } from '@/types/product';
import { mergeById } from '@/utils/quotation-builder-cache';

const STORAGE_KEY = '@qr_shop_web_product_catalog_v1';
const PAGE_SIZE = 200;
const FRESH_MS = 30 * 60 * 1000;

export type WebProductCatalog = {
  products: Product[];
  updatedAt: number;
  complete: boolean;
};

type Listener = (catalog: WebProductCatalog) => void;

let memory: WebProductCatalog | null = null;
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
  if (!q) return products;
  return products.filter(
    item =>
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q),
  );
}

async function fetchAllPages(
  token: string,
  seed: Product[] = [],
): Promise<WebProductCatalog> {
  let products = seed;
  let offset = seed.length;
  let hasMore = true;

  if (seed.length === 0) {
    const first = await fetchProductsPage(token, {
      limit: PAGE_SIZE,
      offset: 0,
    });
    products = first.data;
    offset = first.data.length;
    hasMore = first.hasMore;
    emit({
      products,
      updatedAt: Date.now(),
      complete: !hasMore,
    });
  }

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

/** Progressive product catalog for website Products + Quotation Builder. */
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

  if (!options?.force && memory?.complete) {
    const age = Date.now() - memory.updatedAt;
    if (age < FRESH_MS) {
      return memory;
    }
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
