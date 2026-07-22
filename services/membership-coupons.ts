import { MembershipCouponTicket } from '@/types/membership';
import { webApiRequest } from '@/services/web/client';

type ListResponse = {
  data: MembershipCouponTicket[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};

type DetailResponse = { data: MembershipCouponTicket };

export async function fetchMembershipCoupons(
  token: string,
  options?: {
    q?: string;
    limit?: number;
    offset?: number;
    membershipId?: string;
  },
): Promise<MembershipCouponTicket[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  if (options?.membershipId) params.set('membershipId', options.membershipId);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(
    `/membership-coupons${query}`,
    { token },
  );
  return response.data;
}

export async function fetchMembershipCouponDetail(
  token: string,
  id: string,
): Promise<MembershipCouponTicket> {
  const response = await webApiRequest<DetailResponse>(
    `/membership-coupons/${id}`,
    { token },
  );
  return response.data;
}
