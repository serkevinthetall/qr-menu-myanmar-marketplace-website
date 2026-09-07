import { AuthSession, LoginCredentials } from '@/types/auth';
import { webApiRequest } from '@/services/web/client';

type LoginResponse = {
  token: string;
  user: AuthSession['user'];
  expiresAt: string;
};

export type LoginDevice = {
  id: string;
  label: string;
  platform: string;
  browser: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
};

export function isSessionValid(session: AuthSession | null): boolean {
  if (!session?.token || !session.user?.email) {
    return false;
  }

  return new Date(session.expiresAt).getTime() > Date.now();
}

/** Website ERP login → POST /api/auth/login */
export async function authenticateUser(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const response = await webApiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });

  return {
    token: response.token,
    user: response.user,
    expiresAt: response.expiresAt,
  };
}

export async function logoutUser(token: string): Promise<void> {
  await webApiRequest('/auth/logout', {
    method: 'POST',
    token,
  });
}

export async function fetchLoginDevices(token: string): Promise<LoginDevice[]> {
  const response = await webApiRequest<{ data: LoginDevice[] }>('/auth/devices', {
    token,
  });
  return response.data ?? [];
}

export async function revokeLoginDevice(
  token: string,
  deviceId: string,
): Promise<{ revoked: boolean; revokedCurrent: boolean }> {
  const response = await webApiRequest<{
    data: { revoked: boolean; revokedCurrent: boolean };
  }>(`/auth/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
    token,
  });
  return response.data;
}
