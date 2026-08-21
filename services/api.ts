import { API_BASE_URL } from '@/constants/api';
import {
  isAuthSessionErrorMessage,
  notifySessionExpired,
} from '@/utils/session-expiry';

/**
 * Low-level HTTP helper. Prefer surface-specific clients:
 * - Phone app → `@/services/app/client` (`appApiRequest` → `/api/app/*`)
 * - Website ERP → `@/services/web/client` (`webApiRequest` → `/api/*` web routes)
 */
type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  token?: string;
  body?: unknown;
};

function shouldForceLogin(path: string, status: number, message: string): boolean {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  // Don't bounce away from an intentional failed login attempt.
  if (
    normalized.includes('/auth/login') ||
    normalized.endsWith('/auth/login')
  ) {
    return false;
  }
  return status === 401 || isAuthSessionErrorMessage(message);
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', token, body }: ApiOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const hint = ` Could not reach the API at ${API_BASE_URL}.`;
    throw new Error(
      `Failed to fetch.${hint} The API may be up, but this website origin is blocked by CORS — deploy the backend CORS update, or open DevTools → Network for the blocked request.`,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data.message === 'string' && data.message.trim()
        ? data.message
        : 'Request failed.';
    if (shouldForceLogin(path, response.status, message)) {
      notifySessionExpired();
    }
    throw new Error(message);
  }

  return data as T;
}
