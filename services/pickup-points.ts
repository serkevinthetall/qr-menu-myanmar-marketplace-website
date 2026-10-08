import { PickupPoint, PickupPointInput } from '@/types/pickup-point';
import { webApiRequest } from '@/services/web/client';

type ListResponse = {
  data: PickupPoint[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};

type ItemResponse = {
  data: PickupPoint;
};

export async function fetchPickupPoints(
  token: string,
  options?: {
    q?: string;
    limit?: number;
    offset?: number;
  },
): Promise<PickupPoint[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(
    `/pickup-points${query}`,
    { token },
  );
  return response.data;
}

export async function createPickupPoint(
  token: string,
  input: PickupPointInput,
): Promise<PickupPoint> {
  const response = await webApiRequest<ItemResponse>('/pickup-points', {
    method: 'POST',
    token,
    body: input,
  });
  return response.data;
}

export async function updatePickupPoint(
  token: string,
  id: string,
  input: PickupPointInput,
): Promise<PickupPoint> {
  const response = await webApiRequest<ItemResponse>(
    `/pickup-points/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      token,
      body: input,
    },
  );
  return response.data;
}
