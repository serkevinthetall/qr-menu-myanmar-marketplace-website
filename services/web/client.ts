/**
 * Web ERP API client.
 * Website screens must use this helper with web routes (`/auth`, `/customers`, `/products`, `/quotations`).
 * Never call `/app/*` from the web ERP.
 */
import { apiRequest } from '@/services/api';

type WebApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  token?: string;
  body?: unknown;
};

/** Calls `${API_BASE_URL}${path}` for web ERP routes only. */
export function webApiRequest<T>(path: string, options: WebApiOptions = {}): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/app' || normalized.startsWith('/app/')) {
    throw new Error(
      'Web ERP must not call /api/app/*. Use @/services/app/* from the phone app instead.',
    );
  }
  return apiRequest<T>(normalized, options);
}
