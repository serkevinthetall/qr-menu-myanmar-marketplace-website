import { webApiRequest } from '@/services/web/client';
import { SaleOrder, SaleOrderDetail } from '@/types/sale-order';

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

export async function fetchSaleOrders(
  token: string,
  options?: { q?: string; limit?: number; offset?: number },
): Promise<SaleOrder[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(`/sale-orders${query}`, {
    token,
  });
  return response.data;
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
