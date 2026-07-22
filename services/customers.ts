import {
  ContactSearchResult,
  ContactTag,
  CreateAddressInput,
  CreateCustomerInput,
  Customer,
  CustomerAddress,
  CustomerAddressesResult,
  CustomerDetail,
  Township,
} from '@/types/customer';
import { webApiRequest } from '@/services/web/client';

type CustomersResponse = {
  data: Customer[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};

type CustomerDetailResponse = {
  data: CustomerDetail;
};

type TownshipsResponse = {
  data: Township[];
};

type TagsResponse = {
  data: ContactTag[];
};

type SearchContactsResponse = {
  data: ContactSearchResult[];
};

type CreateCustomerResponse = {
  data: Customer;
};

type CustomerAddressesResponse = {
  data: CustomerAddressesResult;
};

type CreateAddressResponse = {
  data: {
    id: string;
    name: string;
    address: CustomerAddress | null;
    companyId: string;
    defaultAddressId: string;
    addresses: CustomerAddress[];
  };
};

export type CustomersPage = {
  data: Customer[];
  hasMore: boolean;
  offset: number;
  limit: number;
};

export async function fetchCustomers(
  token: string,
  options?: { lite?: boolean; limit?: number; offset?: number; q?: string },
): Promise<Customer[]> {
  const page = await fetchCustomersPage(token, options);
  return page.data;
}

export async function fetchCustomersPage(
  token: string,
  options?: { lite?: boolean; limit?: number; offset?: number; q?: string },
): Promise<CustomersPage> {
  const params = new URLSearchParams();
  if (options?.lite) {
    params.set('lite', '1');
  }
  if (options?.limit !== undefined) {
    params.set('limit', String(options.limit));
  }
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  if (options?.q?.trim()) {
    params.set('q', options.q.trim());
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<CustomersResponse>(`/customers${query}`, {
    token,
  });
  const limit = options?.limit ?? response.meta?.limit ?? response.data.length;
  const offset = options?.offset ?? response.meta?.offset ?? 0;
  return {
    data: response.data,
    hasMore: Boolean(options?.lite) ? (response.meta?.hasMore ?? false) : false,
    offset,
    limit,
  };
}

export async function fetchCustomerDetail(
  token: string,
  id: string,
): Promise<CustomerDetail> {
  const response = await webApiRequest<CustomerDetailResponse>(`/customers/${id}`, {
    token,
  });
  return response.data;
}

export async function fetchTownships(token: string): Promise<Township[]> {
  const response = await webApiRequest<TownshipsResponse>('/customers/townships', {
    token,
  });
  return response.data;
}

export async function fetchContactTags(token: string): Promise<ContactTag[]> {
  const response = await webApiRequest<TagsResponse>('/customers/tags', { token });
  return response.data;
}

export async function searchContactsByPhone(
  token: string,
  phone: string,
): Promise<ContactSearchResult[]> {
  const query = encodeURIComponent(phone);
  const response = await webApiRequest<SearchContactsResponse>(
    `/customers/search?phone=${query}`,
    { token },
  );
  return response.data;
}

export async function createCustomer(
  token: string,
  input: CreateCustomerInput,
): Promise<Customer> {
  const response = await webApiRequest<CreateCustomerResponse>('/customers', {
    token,
    method: 'POST',
    body: input,
  });
  return response.data;
}

export async function fetchCustomerAddresses(
  token: string,
  customerId: string,
): Promise<CustomerAddressesResult> {
  const response = await webApiRequest<CustomerAddressesResponse>(
    `/customers/${customerId}/addresses`,
    { token },
  );
  return response.data;
}

export async function createCustomerAddress(
  token: string,
  companyId: string,
  input: CreateAddressInput,
): Promise<CreateAddressResponse['data']> {
  const response = await webApiRequest<CreateAddressResponse>(
    `/customers/${companyId}/addresses`,
    {
      token,
      method: 'POST',
      body: input,
    },
  );
  return response.data;
}
