import { AuthSession, LoginCredentials } from '@/types/auth';
import { appApiRequest } from '@/services/app/client';

type LoginResponse = {
  token: string;
  user: AuthSession['user'];
  expiresAt: string;
};

/** Phone app login → POST /api/app/auth/login */
export async function authenticateAppUser(
  credentials: LoginCredentials,
): Promise<AuthSession> {
  const response = await appApiRequest<LoginResponse>('/auth/login', {
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
  await appApiRequest('/auth/logout', {
    method: 'POST',
    token,
  });
}
