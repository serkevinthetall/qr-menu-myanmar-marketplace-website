import {
  WEB_COOKIE_AUTH_TOKEN,
  isWebBearerToken,
} from '@/constants/auth-token';
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
  // Web may use cookie sentinel; native app / cross-site web need a real JWT.
  if (!session.token) {
    return false;
  }
  return new Date(session.expiresAt).getTime() > Date.now();
}

/**
 * Website ERP login → POST /api/auth/login.
 * Backend also sets httpOnly cookie (same-site). For cross-site Vercel hosts
 * the browser often omits that cookie, so we keep the JWT and send Bearer.
 */
export async function authenticateUser(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const response = await webApiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
  });

  if (!response?.user?.email || !response.expiresAt) {
    throw new Error('Login succeeded but session details were missing.');
  }

  const token = typeof response.token === 'string' ? response.token.trim() : '';
  if (!token) {
    throw new Error('Login succeeded but access token was missing.');
  }

  return {
    token,
    user: response.user,
    expiresAt: response.expiresAt,
  };
}

/**
 * Restore web session: prefer stored Bearer JWT; fall back to httpOnly cookie.
 */
export async function fetchCurrentUser(
  stored?: AuthSession | null,
): Promise<AuthSession | null> {
  const bearer = isWebBearerToken(stored?.token) ? stored!.token : undefined;
  try {
    const response = await webApiRequest<MeResponse>('/auth/me', {
      token: bearer ?? WEB_COOKIE_AUTH_TOKEN,
    });
    if (!response?.user?.email) {
      return null;
    }
    return {
      token: bearer ?? WEB_COOKIE_AUTH_TOKEN,
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
