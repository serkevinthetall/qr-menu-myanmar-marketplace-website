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

export function isSessionValid(session: AuthSession | null): boolean {
  if (!session?.user?.email) {
    return false;
  }
  if (!session.expiresAt) {
    return false;
  }
  // Web may briefly use cookie sentinel; prefer a real JWT when present.
  if (!session.token) {
    return false;
  }
  return new Date(session.expiresAt).getTime() > Date.now();
}

/** Website ERP login → POST /api/auth/login (Bearer JWT + httpOnly cookie). */
export async function authenticateUser(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const response = await webApiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });

  const token = String(response.token || '').trim();
  if (!token || token === WEB_COOKIE_AUTH_TOKEN) {
    throw new Error('Login succeeded but no session token was returned.');
  }

  return {
    token,
    user: response.user,
    expiresAt: response.expiresAt,
  };
}

/** Restore web session from Bearer storage, or httpOnly cookie via /auth/me. */
export async function fetchCurrentUser(
  stored?: AuthSession | null,
): Promise<AuthSession | null> {
  try {
    const response = await webApiRequest<MeResponse>('/auth/me', {
      token: stored?.token,
    });
    if (!response?.user?.email) {
      return null;
    }
    return {
      token: stored?.token && stored.token !== WEB_COOKIE_AUTH_TOKEN
        ? stored.token
        : WEB_COOKIE_AUTH_TOKEN,
      user: response.user,
      expiresAt:
        response.expiresAt ||
        stored?.expiresAt ||
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  } catch {
    return null;
  }
}

export async function logoutUser(token?: string): Promise<void> {
  await webApiRequest('/auth/logout', {
    method: 'POST',
    token,
  });
}

export async function fetchLoginDevices(token?: string): Promise<LoginDevice[]> {
  const response = await webApiRequest<{ data: LoginDevice[] }>('/auth/devices', {
    token,
  });
  return response.data ?? [];
}

export async function revokeLoginDevice(
  token: string | undefined,
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
