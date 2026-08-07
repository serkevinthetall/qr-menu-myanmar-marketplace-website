import { webApiRequest } from '@/services/web/client';
import {
  AppInstallReason,
  AppInstallRecord,
  AppInstallStatus,
} from '@/types/app-install';

type ListResponse = {
  data: AppInstallRecord[];
  meta?: { count: number; status: AppInstallStatus | null };
};

type OneResponse = { data: AppInstallRecord; meta?: { created?: boolean } };

type MapResponse = { data: Record<string, AppInstallRecord> };

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
  options?: { status?: AppInstallStatus; q?: string },
): Promise<AppInstallRecord[]> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.q) params.set('q', options.q);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(`/app-installs${query}`, {
    token,
  });
  return response.data ?? [];
}

export async function requestAppInstall(
  token: string,
  partnerId: string,
): Promise<AppInstallRecord> {
  const response = await webApiRequest<OneResponse>(
    `/app-installs/${partnerId}/request`,
    { method: 'POST', token },
  );
  return response.data;
}

export async function updateAppInstallStatus(
  token: string,
  partnerId: string,
  body: { status: AppInstallStatus; reason?: AppInstallReason },
): Promise<AppInstallRecord> {
  const response = await webApiRequest<OneResponse>(`/app-installs/${partnerId}`, {
    method: 'PUT',
    token,
    body,
  });
  return response.data;
}
