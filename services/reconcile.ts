import { ReconcileItem } from '@/types/reconcile-item';
import { webApiRequest } from '@/services/web/client';

type ListResponse = {
  data: ReconcileItem[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
    residualTotal?: number;
  };
};

export async function fetchReconcileItems(
  token: string,
  options?: {
    q?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ rows: ReconcileItem[]; residualTotal: number }> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(`/reconcile${query}`, {
    token,
  });
  return {
    rows: response.data,
    residualTotal: Number(response.meta?.residualTotal) || 0,
  };
}
