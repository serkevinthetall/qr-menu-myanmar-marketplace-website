import { AuthSession, LoginCredentials } from '@/types/auth';
import { apiRequest } from '@/services/api';

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

export async function authenticateUser(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const response = await apiRequest<LoginResponse>('/auth/login', {
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
  await apiRequest('/auth/logout', {
    method: 'POST',
    token,
  });
}
