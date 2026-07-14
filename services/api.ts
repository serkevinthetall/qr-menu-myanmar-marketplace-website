import { Platform } from 'react-native';

import { API_BASE_URL } from '@/constants/api';

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
  } catch (error) {
    const hint =
      Platform.OS === 'web'
        ? ` Could not reach the API at ${API_BASE_URL}. Is the backend running on port 4000?`
        : '';
    throw new Error(
      `Failed to fetch.${hint}${error instanceof Error && error.message !== 'Failed to fetch' ? ` ${error.message}` : ''}`,
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? 'Request failed.');
  }

  return data as T;
}
