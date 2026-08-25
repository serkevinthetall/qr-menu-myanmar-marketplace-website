/** @temp-feature app-install-call-list */
import { webApiRequest } from '@/services/web/client';

import {
  AppInstallReason,
  AppInstallRecord,
  AppInstallStatus,
  AppInstallTag,
} from './types';
import { OverviewAreaSeries } from '@/types/overview';

export const CALL_LIST_BADGE_REFRESH_EVENT = 'qr-shop-call-list-badge-refresh';

type ListResponse = {
  data: AppInstallRecord[];
  meta?: {
    count: number;
    status: AppInstallStatus | null;
    statuses?: AppInstallStatus[];
    tags?: AppInstallTag[];
    townships?: string[];
  };
};

type OneResponse = { data: AppInstallRecord; meta?: { created?: boolean } };

type MapResponse = { data: Record<string, AppInstallRecord> };

type BadgeResponse = { data: { newCount?: number; notInstalledCount?: number } };

export function notifyCallListBadgeChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CALL_LIST_BADGE_REFRESH_EVENT));
  }
}

export async function fetchAppInstallMap(
  token: string,
  ids?: string[],
): Promise<Record<string, AppInstallRecord>> {
  const params = new URLSearchParams();
  if (ids?.length) {
    params.set('ids', ids.join(','));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<MapResponse>(`/app-installs/map${query}`, {
    token,
  });
  return response.data ?? {};
}

export async function fetchCallList(
  token: string,
  options?: { status?: AppInstallStatus | AppInstallStatus[]; q?: string },
): Promise<{
  data: AppInstallRecord[];
  tags: AppInstallTag[];
  townships: string[];
}> {
  const params = new URLSearchParams();
  if (options?.status) {
    const statuses = Array.isArray(options.status)
      ? options.status
      : [options.status];
    if (statuses.length > 0) {
      params.set('status', statuses.join(','));
    }
  }
  if (options?.q) params.set('q', options.q);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(`/app-installs${query}`, {
    token,
  });
  return {
    data: response.data ?? [],
    tags: response.meta?.tags ?? [],
    townships: response.meta?.townships ?? [],
  };
}

export async function fetchCallListNewCount(token: string): Promise<number> {
  const response = await webApiRequest<BadgeResponse>('/app-installs/badge', {
    token,
  });
  return (
    Number(response.data?.newCount) ||
    Number(response.data?.notInstalledCount) ||
    0
  );
}

export type AppUserListRange = 'today' | 'yesterday' | 'week' | 'month';

type AppUserListSummaryResponse = {
  data: {
    range: AppUserListRange;
    count: number;
  };
};

type AppUserListTimelineResponse = {
  data: {
    range: AppUserListRange;
    count: number;
    buckets: string[];
    series: OverviewAreaSeries[];
  };
};

export type AppUserListBreakdownItem = {
  id: string;
  label: string;
  count: number;
};

type AppUserListBreakdownResponse = {
  data: {
    range: AppUserListRange;
    status: AppInstallStatus | 'all';
    byStatus: AppUserListBreakdownItem[];
    byTownship: AppUserListBreakdownItem[];
    byTag: AppUserListBreakdownItem[];
    townshipStatus: AppInstallStatus | 'all';
    tagStatus?: AppInstallStatus | 'all';
  };
};

export async function fetchAppUserListSummary(
  token: string,
  range: AppUserListRange,
  status: AppInstallStatus | 'all' = 'installed',
): Promise<number> {
  const statusQuery =
    status && status !== 'all' ? `&status=${encodeURIComponent(status)}` : '';
  const response = await webApiRequest<AppUserListSummaryResponse>(
    `/app-installs/analytics/summary?range=${range}${statusQuery}`,
    { token },
  );
  return response.data?.count ?? 0;
}

export async function fetchAppUserListTimeline(
  token: string,
  range: AppUserListRange,
  status: AppInstallStatus | 'all' = 'installed',
): Promise<{ buckets: string[]; series: OverviewAreaSeries[]; count: number }> {
  const statusQuery =
    status && status !== 'all' ? `&status=${encodeURIComponent(status)}` : '';
  const response = await webApiRequest<AppUserListTimelineResponse>(
    `/app-installs/analytics/timeline?range=${range}${statusQuery}`,
    { token },
  );
  return {
    buckets: response.data?.buckets ?? [],
    series: response.data?.series ?? [],
    count: response.data?.count ?? 0,
  };
}

export async function fetchAppUserListBreakdown(
  token: string,
  range: AppUserListRange,
  status: AppInstallStatus | 'all' = 'installed',
): Promise<{
  byStatus: AppUserListBreakdownItem[];
  byTownship: AppUserListBreakdownItem[];
  byTag: AppUserListBreakdownItem[];
  townshipStatus: AppInstallStatus | 'all';
  tagStatus: AppInstallStatus | 'all';
}> {
  const statusQuery =
    status && status !== 'all' ? `&status=${encodeURIComponent(status)}` : '';
  const response = await webApiRequest<AppUserListBreakdownResponse>(
    `/app-installs/analytics/breakdown?range=${range}${statusQuery}`,
    { token },
  );
  return {
    byStatus: response.data?.byStatus ?? [],
    byTownship: response.data?.byTownship ?? [],
    byTag: response.data?.byTag ?? [],
    townshipStatus: response.data?.townshipStatus ?? 'installed',
    tagStatus:
      response.data?.tagStatus ?? response.data?.townshipStatus ?? 'installed',
  };
}

export async function requestAppInstall(
  token: string,
  partnerId: string,
  snapshot?: { name?: string; phone?: string },
): Promise<AppInstallRecord> {
  const response = await webApiRequest<OneResponse>(
    `/app-installs/${partnerId}/request`,
    {
      method: 'POST',
      token,
      body: {
        name: snapshot?.name ?? '',
        phone: snapshot?.phone ?? '',
      },
    },
  );
  notifyCallListBadgeChanged();
  return response.data;
}

export async function updateAppInstallStatus(
  token: string,
  partnerId: string,
  body: {
    status: AppInstallStatus;
    reason?: AppInstallReason;
    reasonNote?: string;
  },
): Promise<AppInstallRecord> {
  const response = await webApiRequest<OneResponse>(`/app-installs/${partnerId}`, {
    method: 'PUT',
    token,
    body,
  });
  notifyCallListBadgeChanged();
  return response.data;
}

export async function removeFromCallList(
  token: string,
  partnerId: string,
): Promise<void> {
  await webApiRequest<{ data: { odooPartnerId: string; removed: boolean } }>(
    `/app-installs/${partnerId}`,
    { method: 'DELETE', token },
  );
  notifyCallListBadgeChanged();
}
