import { API_BASE_URL } from '@/constants/api';

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
    throw new Error(data.message ?? 'Request failed.');
  }

  return data as T;
}
