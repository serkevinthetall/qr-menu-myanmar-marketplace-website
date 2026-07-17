import { AuthSession, LoginCredentials } from '@/types/auth';
import { apiRequest } from '@/services/api';

type LoginResponse = {
  token: string;
  user: AuthSession['user'];
  expiresAt: string;
};

export async function authenticateAppUser(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const response = await apiRequest<LoginResponse>('/app/auth/login', {
    method: 'POST',
    body: credentials,
  });

  return {
    token: response.token,
    user: response.user,
    expiresAt: response.expiresAt,
  };
}

export async function logoutAppUser(token: string): Promise<void> {
  await apiRequest('/app/auth/logout', {
    method: 'POST',
    token,
  });
}
