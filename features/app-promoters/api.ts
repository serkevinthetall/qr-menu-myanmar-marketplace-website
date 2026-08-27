import { webApiRequest } from '@/services/web/client';

import type { AppPromoter } from './types';

type ListResponse = { data: AppPromoter[] };
type OneResponse = { data: AppPromoter };

export async function fetchAppPromoters(
  token: string,
  options?: { activeOnly?: boolean },
): Promise<AppPromoter[]> {
  const params = new URLSearchParams();
  if (options?.activeOnly) {
    params.set('active', 'true');
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(`/app-promoters${query}`, {
    token,
  });
  return response.data ?? [];
}

export async function createAppPromoter(
  token: string,
  name: string,
): Promise<AppPromoter> {
  const response = await webApiRequest<OneResponse>('/app-promoters', {
    method: 'POST',
    token,
    body: { name },
  });
  return response.data;
}

export async function updateAppPromoter(
  token: string,
  id: string,
  body: { name?: string; active?: boolean },
): Promise<AppPromoter> {
  const response = await webApiRequest<OneResponse>(`/app-promoters/${id}`, {
    method: 'PUT',
    token,
    body,
  });
  return response.data;
}

export async function deleteAppPromoter(
  token: string,
  id: string,
): Promise<void> {
  await webApiRequest<{ data: { id: string; removed: boolean } }>(
    `/app-promoters/${id}`,
    { method: 'DELETE', token },
  );
}
