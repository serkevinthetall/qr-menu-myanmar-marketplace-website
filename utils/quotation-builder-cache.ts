import { Customer } from '@/types/customer';
import { Product } from '@/types/product';
import { PaymentMethod } from '@/types/quotation';

const CACHE_TTL_MS = 5 * 60 * 1000;

export type QuotationBuilderCache = {
  customers: Customer[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  customersComplete: boolean;
  productsComplete: boolean;
  updatedAt: number;
};

let cache: QuotationBuilderCache | null = null;

export function getQuotationBuilderCache(): QuotationBuilderCache | null {
  if (!cache) {
    return null;
  }
  if (Date.now() - cache.updatedAt > CACHE_TTL_MS) {
    return null;
  }
  return cache;
}

export function isQuotationBuilderCacheFresh(): boolean {
  const current = getQuotationBuilderCache();
  return Boolean(
    current &&
      current.customers.length > 0 &&
      current.products.length > 0 &&
      current.customersComplete &&
      current.productsComplete,
  );
}

export function setQuotationBuilderCache(
  next: Omit<QuotationBuilderCache, 'updatedAt'> & { updatedAt?: number },
) {
  cache = {
    ...next,
    updatedAt: next.updatedAt ?? Date.now(),
  };
  return cache;
}

export function patchQuotationBuilderCache(
  patch: Partial<Omit<QuotationBuilderCache, 'updatedAt'>>,
) {
  if (!cache) {
    return null;
  }
  cache = {
    ...cache,
    ...patch,
    updatedAt: Date.now(),
  };
  return cache;
}

export function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  if (incoming.length === 0) {
    return existing;
  }
  const map = new Map(existing.map(item => [item.id, item]));
  for (const item of incoming) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

export function clearQuotationBuilderCache() {
  cache = null;
}
