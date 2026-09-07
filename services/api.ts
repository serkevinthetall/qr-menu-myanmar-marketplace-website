import axios, { AxiosError, isAxiosError } from 'axios';

import { API_BASE_URL } from '@/constants/api';
import {
  isAuthSessionErrorMessage,
  notifySessionExpired,
} from '@/utils/session-expiry';

/**
 * Shared Axios instance for web + app surfaces.
 * Prefer surface-specific clients:
 * - Phone app → `@/services/app/client` (`appApiRequest` → `/api/app/*`)
 * - Website ERP → `@/services/web/client` (`webApiRequest` → `/api/*` web routes)
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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

function messageFromAxiosError(error: AxiosError<{ message?: string }>): string {
  const data = error.response?.data;
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }
  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return 'Request failed.';
}

/** Low-level HTTP helper backed by Axios. */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', token, body }: ApiOptions = {},
): Promise<T> {
  const normalized = path.startsWith('/') ? path : `/${path}`;

  try {
    const response = await api.request<T>({
      url: normalized,
      method,
      data: body,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return response.data;
  } catch (error) {
    if (isAxiosError(error)) {
      if (!error.response) {
        const hint = ` Could not reach the API at ${API_BASE_URL}.`;
        throw new Error(
          `Failed to fetch.${hint} The API may be up, but this website origin is blocked by CORS — deploy the backend CORS update, or open DevTools → Network for the blocked request.`,
        );
      }

      const message = messageFromAxiosError(
        error as AxiosError<{ message?: string }>,
      );
      if (shouldForceLogin(normalized, error.response.status, message)) {
        notifySessionExpired();
      }
      throw new Error(message);
    }
    throw error instanceof Error ? error : new Error('Request failed.');
  }
}
