import { webApiRequest } from '@/services/web/client';
import { PurchaseOrder, PurchaseOrderDetail } from '@/types/purchase-order';

type ListResponse = {
  data: PurchaseOrder[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};

type DetailResponse = { data: PurchaseOrderDetail };

export async function fetchPurchaseOrders(
  token: string,
  options?: { q?: string; limit?: number; offset?: number },
): Promise<PurchaseOrder[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(`/purchase-orders${query}`, {
    token,
  });
  return response.data;
}

export async function fetchPurchaseOrderDetail(
  token: string,
  id: string,
): Promise<PurchaseOrderDetail> {
  const response = await webApiRequest<DetailResponse>(`/purchase-orders/${id}`, {
    token,
  });
  return response.data;
}
