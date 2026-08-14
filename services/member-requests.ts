import {
  MemberRequest,
  MemberRequestMeta,
  MemberRequestStatus,
} from '@/types/member-request';
import { webApiRequest } from '@/services/web/client';

type ListResponse = {
  data: MemberRequest[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
    status: string | null;
  };
};

type DetailResponse = { data: MemberRequest };
type MetaResponse = { data: MemberRequestMeta };
type BadgeResponse = { data: { requestedCount: number } };

export const MEMBER_REQUEST_BADGE_REFRESH_EVENT =
  'qr-shop-member-request-badge-refresh';

export function notifyMemberRequestBadgeChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MEMBER_REQUEST_BADGE_REFRESH_EVENT));
}

export async function fetchMemberRequests(
  token: string,
  options?: {
    q?: string;
    status?: string;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  },
): Promise<MemberRequest[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.status) params.set('status', options.status);
  if (options?.from) params.set('from', options.from);
  if (options?.to) params.set('to', options.to);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(`/member-requests${query}`, {
    token,
  });
  return response.data;
}

export async function fetchMemberRequestDetail(
  token: string,
  id: string,
): Promise<MemberRequest> {
  const response = await webApiRequest<DetailResponse>(`/member-requests/${id}`, {
    token,
  });
  return response.data;
}

export async function fetchMemberRequestMeta(
  token: string,
): Promise<MemberRequestMeta> {
  const response = await webApiRequest<MetaResponse>('/member-requests/meta', {
    token,
  });
  return response.data;
}

export async function fetchMemberRequestBadgeCount(
  token: string,
): Promise<number> {
  const response = await webApiRequest<BadgeResponse>('/member-requests/badge', {
    token,
  });
  return response.data.requestedCount;
}

export async function updateMemberRequestStatus(
  token: string,
  id: string,
  status: MemberRequestStatus,
): Promise<MemberRequest> {
  const response = await webApiRequest<DetailResponse>(
    `/member-requests/${id}/status`,
    {
      token,
      method: 'PUT',
      body: { status },
    },
  );
  notifyMemberRequestBadgeChanged();
  return response.data;
}
