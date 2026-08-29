import { webApiRequest } from '@/services/web/client';

import type {
  OnHandMeta,
  OnHandProduct,
  StockMoveLine,
  StockMovesMeta,
} from './types';

type OnHandResponse = {
  data: OnHandProduct[];
  meta: OnHandMeta;
};

type MovesResponse = {
  data: StockMoveLine[];
  meta: StockMovesMeta;
};

export async function fetchOnHandProducts(
  token: string,
  options?: {
    q?: string;
    category?: string;
    hideZero?: boolean;
    limit?: number;
    offset?: number;
  },
): Promise<{ rows: OnHandProduct[]; meta: OnHandMeta }> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.category) params.set('category', options.category);
  if (options?.hideZero) params.set('hideZero', '1');
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.offset != null) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<OnHandResponse>(
    `/inventory/on-hand${query}`,
    { token },
  );
  return {
    rows: response.data ?? [],
    meta: response.meta ?? {
      limit: 500,
      offset: 0,
      count: 0,
      totalOnHand: 0,
      hasMore: false,
      hideZero: false,
    },
  };
}

export async function fetchStockMoves(
  token: string,
  options?: {
    month?: string;
    q?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ rows: StockMoveLine[]; meta: StockMovesMeta }> {
  const params = new URLSearchParams();
  if (options?.month) params.set('month', options.month);
  if (options?.q) params.set('q', options.q);
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.offset != null) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<MovesResponse>(
    `/inventory/moves${query}`,
    { token },
  );
  return {
    rows: response.data ?? [],
    meta: response.meta ?? {
      limit: 200,
      offset: 0,
      count: 0,
      totalQuantity: 0,
      hasMore: false,
      month: null,
    },
  };
}
