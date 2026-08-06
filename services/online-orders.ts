import { webApiRequest } from '@/services/web/client';
import { SaleOrder, SaleOrderDetail } from '@/types/sale-order';
import { mergeById } from '@/utils/quotation-builder-cache';

type ListResponse = {
  data: SaleOrder[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};

type DetailResponse = { data: SaleOrderDetail };

export type OnlineOrdersPage = {
  data: SaleOrder[];
  hasMore: boolean;
  offset: number;
  limit: number;
};

export async function fetchOnlineOrdersPage(
  token: string,
  options?: { q?: string; limit?: number; offset?: number },
): Promise<OnlineOrdersPage> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(`/online-orders${query}`, {
    token,
  });
  const limit = options?.limit ?? response.meta?.limit ?? response.data.length;
  const offset = options?.offset ?? response.meta?.offset ?? 0;
  return {
    data: response.data,
    hasMore: response.meta?.hasMore ?? false,
    offset,
    limit,
  };
}

/** Loads every app-order page into memory (100 by 100 until done). */
export async function fetchOnlineOrders(
  token: string,
  options?: {
    q?: string;
    /** When set, fetches a single page only (used by new-order alerts). */
    limit?: number;
    pageSize?: number;
    onPage?: (all: SaleOrder[]) => void;
  },
): Promise<SaleOrder[]> {
  // Alert polling and other single-page callers.
  if (options?.limit !== undefined && options.pageSize === undefined) {
    const page = await fetchOnlineOrdersPage(token, {
      q: options.q,
      limit: options.limit,
      offset: 0,
    });
    return page.data;
  }

  const pageSize = options?.pageSize ?? 100;
  let offset = 0;
  let all: SaleOrder[] = [];
  let hasMore = true;

  while (hasMore) {
    const page = await fetchOnlineOrdersPage(token, {
      q: options?.q,
      limit: pageSize,
      offset,
    });
    all = mergeById(all, page.data);
    options?.onPage?.(all);
    hasMore = page.hasMore && page.data.length > 0;
    offset += page.data.length;
    if (page.data.length === 0) break;
  }

  return all;
}

export async function fetchOnlineOrderDetail(
  token: string,
  id: string,
): Promise<SaleOrderDetail> {
  const response = await webApiRequest<DetailResponse>(`/online-orders/${id}`, {
    token,
  });
  return response.data;
}
