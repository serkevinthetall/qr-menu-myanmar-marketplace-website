import { ChartAccount } from '@/types/chart-account';
import { webApiRequest } from '@/services/web/client';

type ListResponse = {
  data: ChartAccount[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
    reconcilableCount?: number;
  };
};

export async function fetchChartOfAccounts(
  token: string,
  options?: {
    q?: string;
    filter?: string;
    limit?: number;
    offset?: number;
  },
): Promise<ChartAccount[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.filter) params.set('filter', options.filter);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(
    `/chart-of-accounts${query}`,
    { token },
  );
  return response.data;
}
