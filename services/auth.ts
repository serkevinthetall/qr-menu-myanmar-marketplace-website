import { AuthSession, LoginCredentials } from '@/types/auth';
import { webApiRequest } from '@/services/web/client';

type LoginResponse = {
  token: string;
  user: AuthSession['user'];
  expiresAt: string;
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
