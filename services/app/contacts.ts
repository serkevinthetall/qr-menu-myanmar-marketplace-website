import { appApiRequest } from '@/services/app/client';

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

export type AppTownship = {
  id: string;
  name: string;
};

export type AppContactAddress = {
  id: string;
  name: string;
  phone: string;
  street: string;
  street2: string;
  city: string;
  township: string;
  isMain: boolean;
  label: string;
};

export type AppContactAddresses = {
  companyId: string;
  companyName: string;
  defaultAddressId: string;
  addresses: AppContactAddress[];
};

type ContactsResponse = {
  data: AppContact[];
  meta?: { limit: number; offset: number; count: number; hasMore: boolean };
};

type TownshipsResponse = { data: AppTownship[] };
type CreateContactResponse = { data: AppContact };
type AddressesResponse = { data: AppContactAddresses };

export type CreateAppContactInput = {
  name: string;
  phone: string;
  townshipId: string;
  street?: string;
  email?: string;
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
  const response = await appApiRequest<ContactsResponse>(`/contacts${query}`, {
    token,
  });
  return response.data;
}

export async function fetchAppTownships(token: string): Promise<AppTownship[]> {
  const response = await appApiRequest<TownshipsResponse>('/contacts/townships', {
    token,
  });
  return response.data;
}

export async function createAppContact(
  token: string,
  input: CreateAppContactInput,
): Promise<AppContact> {
  const response = await appApiRequest<CreateContactResponse>('/contacts', {
    method: 'POST',
    token,
    body: input,
  });
  return response.data;
}

export async function fetchAppContactAddresses(
  token: string,
  contactId: string,
): Promise<AppContactAddresses> {
  const response = await appApiRequest<AddressesResponse>(
    `/contacts/${contactId}/addresses`,
    { token },
  );
  return response.data;
}
