import { apiRequest } from '@/services/api';

export type AppContact = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  township: string;
  company: string;
  isCompany: boolean;
};

type ContactsResponse = {
  data: AppContact[];
  meta?: { limit: number; offset: number; count: number; hasMore: boolean };
};

export async function fetchAppContacts(
  token: string,
  options?: { q?: string; limit?: number; offset?: number },
): Promise<AppContact[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) params.set('offset', String(options.offset));
  const query = params.toString() ? `?${params}` : '';
  const response = await apiRequest<ContactsResponse>(`/app/contacts${query}`, {
    token,
  });
  return response.data;
}
