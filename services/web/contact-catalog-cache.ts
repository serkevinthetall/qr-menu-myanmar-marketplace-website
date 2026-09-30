import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchCustomersPage } from '@/services/customers';
import { Customer } from '@/types/customer';
import { mergeById } from '@/utils/quotation-builder-cache';

const STORAGE_KEY = '@qr_shop_web_contact_catalog_v1';
/** First paint targets this many rows; the rest load in the background. */
const PAGE_SIZE = 200;
/** After a complete catalog, only pull write_date deltas unless forced. */
const FRESH_MS = 30 * 60 * 1000;

export type WebContactCatalog = {
  customers: Customer[];
  /** Max Odoo write_date seen — next sync uses since= this value. */
  since: string;
  updatedAt: number;
  complete: boolean;
};

type Listener = (catalog: WebContactCatalog) => void;

let memory: WebContactCatalog | null = null;
let inflight: Promise<WebContactCatalog> | null = null;
const listeners = new Set<Listener>();

function emit(next: WebContactCatalog) {
  memory = next;
  for (const listener of listeners) {
    listener(next);
  }
}

async function persist(catalog: WebContactCatalog) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    // best-effort
  }
}

async function readDisk(): Promise<WebContactCatalog | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WebContactCatalog;
    if (!parsed || !Array.isArray(parsed.customers)) return null;
    return {
      customers: parsed.customers,
      since: typeof parsed.since === 'string' ? parsed.since : '',
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : 0,
      complete: Boolean(parsed.complete),
    };
  } catch {
    return null;
  }
}

function maxWriteDate(customers: Customer[]): string {
  let max = '';
  for (const c of customers) {
    const w = String(c.writeDate ?? '').trim();
    if (w && w > max) max = w;
  }
  return max;
}

function sortByName(customers: Customer[]): Customer[] {
  return [...customers].sort((a, b) => a.name.localeCompare(b.name));
}

/** Apply delta rows: upsert active, drop inactive/archived. */
function applyDelta(existing: Customer[], delta: Customer[]): Customer[] {
  if (delta.length === 0) return existing;
  const map = new Map(existing.map(item => [item.id, item]));
  for (const row of delta) {
    if (row.active === false) {
      map.delete(row.id);
    } else {
      map.set(row.id, row);
    }
  }
  return sortByName(Array.from(map.values()));
}

export function getWebContactCatalog(): WebContactCatalog | null {
  return memory;
}

export function subscribeWebContactCatalog(listener: Listener): () => void {
  listeners.add(listener);
  if (memory) listener(memory);
  return () => {
    listeners.delete(listener);
  };
}

export function clearWebContactCatalog() {
  memory = null;
  inflight = null;
  void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
}

/** Upsert one contact after create/edit without a full reload. */
export function upsertWebContact(customer: Customer) {
  const base = memory?.customers ?? [];
  const customers = applyDelta(base, [{ ...customer, active: customer.active !== false }]);
  const since = maxWriteDate(customers) || memory?.since || '';
  const next: WebContactCatalog = {
    customers,
    since,
    updatedAt: Date.now(),
    complete: memory?.complete ?? true,
  };
  emit(next);
  void persist(next);
}

async function fetchDelta(token: string, since: string): Promise<WebContactCatalog> {
  let customers = memory?.customers ?? [];
  let offset = 0;
  let hasMore = true;
  let latestSince = since;

  while (hasMore) {
    const page = await fetchCustomersPage(token, {
      limit: PAGE_SIZE,
      offset,
      since,
    });
    customers = applyDelta(customers, page.data);
    const pageMax = maxWriteDate(page.data);
    if (pageMax > latestSince) latestSince = pageMax;
    offset += page.data.length;
    hasMore = page.hasMore && page.data.length > 0;
    emit({
      customers,
      since: latestSince || since,
      updatedAt: Date.now(),
      complete: true,
    });
    if (page.data.length === 0) break;
  }

  const finalCatalog: WebContactCatalog = {
    customers,
    since: latestSince || since || maxWriteDate(customers),
    updatedAt: Date.now(),
    complete: true,
  };
  emit(finalCatalog);
  await persist(finalCatalog);
  return finalCatalog;
}

async function fetchRemainingPages(
  token: string,
  seed: Customer[],
): Promise<WebContactCatalog> {
  let customers = sortByName(seed);
  let offset = seed.length;
  let hasMore = true;

  while (hasMore) {
    const page = await fetchCustomersPage(token, {
      limit: PAGE_SIZE,
      offset,
    });
    customers = sortByName(mergeById(customers, page.data));
    offset += page.data.length;
    hasMore = page.hasMore && page.data.length > 0;
    emit({
      customers,
      since: maxWriteDate(customers),
      updatedAt: Date.now(),
      complete: !hasMore,
    });
    if (page.data.length === 0) break;
  }

  const finalCatalog: WebContactCatalog = {
    customers,
    since: maxWriteDate(customers),
    updatedAt: Date.now(),
    complete: true,
  };
  emit(finalCatalog);
  await persist(finalCatalog);
  return finalCatalog;
}

async function fetchAllPages(token: string): Promise<WebContactCatalog> {
  const first = await fetchCustomersPage(token, {
    limit: PAGE_SIZE,
    offset: 0,
  });
  const firstCatalog: WebContactCatalog = {
    customers: sortByName(first.data),
    since: maxWriteDate(first.data),
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

function startBackgroundFullLoad(token: string): Promise<WebContactCatalog> {
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
 * Contact catalog with disk cache + incremental Odoo sync.
 *
 * - Shows cached contacts immediately.
 * - First load: progressive pages (~200 at a time).
 * - Later loads: only partners with write_date >= last watermark (new/updated).
 * - `force: true` rebuilds the full catalog from Odoo.
 */
export async function ensureWebContactCatalog(
  token: string,
  options?: { force?: boolean },
): Promise<WebContactCatalog> {
  if (!memory) {
    const disk = await readDisk();
    if (disk && disk.customers.length > 0) {
      emit(disk);
    }
  }

  if (options?.force) {
    return startBackgroundFullLoad(token);
  }

  if (memory?.complete && memory.since) {
    const age = Date.now() - memory.updatedAt;
    if (age < FRESH_MS) {
      // Still pull a cheap delta so brand-new contacts appear.
      try {
        return await fetchDelta(token, memory.since);
      } catch {
        return memory;
      }
    }
    try {
      return await fetchDelta(token, memory.since);
    } catch (error) {
      if (memory) return memory;
      throw error;
    }
  }

  if (memory?.complete && !memory.since) {
    // Legacy/incomplete watermark — one full rebuild to seed since.
    return startBackgroundFullLoad(token);
  }

  if (memory && memory.customers.length > 0 && !memory.complete) {
    // Resume progressive load.
    return startBackgroundFullLoad(token);
  }

  return startBackgroundFullLoad(token);
}
