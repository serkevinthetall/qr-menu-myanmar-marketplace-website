import { webApiRequest } from '@/services/web/client';

import type {
  AppPromoterCommission,
  AppPromoterCommissionMeta,
} from './types';

type ListResponse = {
  data: AppPromoterCommission[];
  meta: AppPromoterCommissionMeta;
};

export async function fetchAppPromoterCommissions(
  token: string,
  options?: {
    month?: string;
    promoterId?: string;
    q?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ rows: AppPromoterCommission[]; meta: AppPromoterCommissionMeta }> {
  const params = new URLSearchParams();
  if (options?.month) {
    params.set('month', options.month);
  }
  if (options?.promoterId) {
    params.set('promoterId', options.promoterId);
  }
  if (options?.q) {
    params.set('q', options.q);
  }
  if (options?.limit != null) {
    params.set('limit', String(options.limit));
  }
  if (options?.offset != null) {
    params.set('offset', String(options.offset));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(
    `/app-promoter-commissions${query}`,
    { token },
  );
  return {
    rows: response.data ?? [],
    meta: response.meta ?? {
      limit: 500,
      offset: 0,
      count: 0,
      totalAmount: 0,
      hasMore: false,
    },
  };
}
