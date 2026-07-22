import { Membership } from '@/types/membership';
import { webApiRequest } from '@/services/web/client';

type ListResponse = {
  data: Membership[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};

type DetailResponse = { data: Membership };

export async function fetchMemberships(
  token: string,
  options?: { q?: string; limit?: number; offset?: number },
): Promise<Membership[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(`/memberships${query}`, {
    token,
  });
  return response.data;
}

export async function fetchMembershipDetail(
  token: string,
  id: string,
): Promise<Membership> {
  const response = await webApiRequest<DetailResponse>(`/memberships/${id}`, {
    token,
  });
  return response.data;
}
