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

export type SaleOrdersPage = {
  data: SaleOrder[];
  hasMore: boolean;
  offset: number;
  limit: number;
};

export async function fetchSaleOrdersPage(
  token: string,
  options?: { q?: string; limit?: number; offset?: number },
): Promise<SaleOrdersPage> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(`/sale-orders${query}`, {
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

/** Loads every sale-order page into memory (100 by 100 until done). */
export async function fetchSaleOrders(
  token: string,
  options?: {
    q?: string;
    pageSize?: number;
    onPage?: (all: SaleOrder[]) => void;
  },
): Promise<SaleOrder[]> {
  const pageSize = options?.pageSize ?? 100;
  let offset = 0;
  let all: SaleOrder[] = [];
  let hasMore = true;

  while (hasMore) {
    const page = await fetchSaleOrdersPage(token, {
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

export async function fetchSaleOrderDetail(
  token: string,
  id: string,
): Promise<SaleOrderDetail> {
  const response = await webApiRequest<DetailResponse>(`/sale-orders/${id}`, {
    token,
  });
  return response.data;
}
