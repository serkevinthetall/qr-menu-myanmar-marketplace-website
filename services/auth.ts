import { WEB_COOKIE_AUTH_TOKEN } from '@/constants/auth-token';
import { AuthSession, LoginCredentials } from '@/types/auth';
import { webApiRequest } from '@/services/web/client';

export { WEB_COOKIE_AUTH_TOKEN } from '@/constants/auth-token';

type LoginResponse = {
  token?: string;
  user: AuthSession['user'];
  expiresAt: string;
  authMode?: 'cookie' | 'bearer';
};

type MeResponse = {
  user: AuthSession['user'];
  expiresAt?: string;
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

/** Web sessions are cookie-backed; token may be the cookie sentinel. */
export function isSessionValid(session: AuthSession | null): boolean {
  if (!session?.user?.email) {
    return false;
  }
  if (!session.expiresAt) {
    return false;
  }
  return new Date(session.expiresAt).getTime() > Date.now();
}

/** Website ERP login → POST /api/auth/login (sets httpOnly cookie). */
export async function authenticateUser(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const response = await webApiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });

  return {
    token: WEB_COOKIE_AUTH_TOKEN,
    user: response.user,
    expiresAt: response.expiresAt,
  };
}

/** Restore web session from httpOnly cookie. */
export async function fetchCurrentUser(): Promise<AuthSession | null> {
  try {
    const response = await webApiRequest<MeResponse>('/auth/me');
    if (!response?.user?.email) {
      return null;
    }
    return {
      token: WEB_COOKIE_AUTH_TOKEN,
      user: response.user,
      expiresAt:
        response.expiresAt ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function logoutUser(_token?: string): Promise<void> {
  await webApiRequest('/auth/logout', {
    method: 'POST',
  });
}

export async function fetchLoginDevices(_token?: string): Promise<LoginDevice[]> {
  const response = await webApiRequest<{ data: LoginDevice[] }>('/auth/devices');
  return response.data ?? [];
}

export async function revokeLoginDevice(
  _token: string | undefined,
  deviceId: string,
): Promise<{ revoked: boolean; revokedCurrent: boolean }> {
  const response = await webApiRequest<{
    data: { revoked: boolean; revokedCurrent: boolean };
  }>(`/auth/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
  });
  return response.data;
}
