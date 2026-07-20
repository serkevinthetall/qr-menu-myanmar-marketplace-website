/**
 * Phone / sales-rep API client.
 * ALL handheld traffic must go through this helper so paths stay under `/api/app/*`.
 * Do not import `@/services/customers`, `@/services/quotations`, or other web ERP clients from app screens.
 */
import { apiRequest } from '@/services/api';

type AppApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  token?: string;
  body?: unknown;
};

/** Calls `${API_BASE_URL}/app${path}` — e.g. path `/contacts` → `/api/app/contacts`. */
export function appApiRequest<T>(path: string, options: AppApiOptions = {}): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return apiRequest<T>(`/app${normalized}`, options);
}
