import { webApiRequest } from '@/services/web/client';

import type { AppPromoter } from './types';

type ListResponse = { data: AppPromoter[] };

/** App Promoters from Odoo (read-only). Manage in Odoo Contacts → App Promoter. */
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
