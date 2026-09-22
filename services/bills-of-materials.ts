import {
  BillOfMaterials,
  BillOfMaterialsDetail,
  CreateBomPayload,
} from '@/types/bill-of-materials';
import { webApiRequest } from '@/services/web/client';

type ListResponse = {
  data: BillOfMaterials[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};

type DetailResponse = { data: BillOfMaterialsDetail };

export async function fetchBillsOfMaterials(
  token: string,
  options?: { q?: string; limit?: number; offset?: number },
): Promise<BillOfMaterials[]> {
  const params = new URLSearchParams();
  if (options?.q?.trim()) params.set('q', options.q.trim());
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(
    `/bills-of-materials${query}`,
    { token },
  );
  return response.data;
}

export async function fetchBillOfMaterialsDetail(
  token: string,
  id: string,
): Promise<BillOfMaterialsDetail> {
  const response = await webApiRequest<DetailResponse>(
    `/bills-of-materials/${id}`,
    { token },
  );
  return response.data;
}

export async function createBillOfMaterials(
  token: string,
  payload: CreateBomPayload,
): Promise<BillOfMaterialsDetail> {
  const response = await webApiRequest<DetailResponse>('/bills-of-materials', {
    token,
    method: 'POST',
    body: {
      productId: Number(payload.productId),
      quantity: payload.quantity,
      code: payload.code,
      type: payload.type || 'normal',
      lines: payload.lines.map(line => ({
        productId: Number(line.productId),
        quantity: line.quantity,
      })),
    },
  });
  return response.data;
}
