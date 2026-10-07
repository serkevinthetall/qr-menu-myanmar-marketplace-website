import {
  CustomerInvoice,
  CustomerInvoiceMonthGroup,
  CustomerInvoiceMonthTotals,
} from '@/types/customer-invoice';
import { webApiRequest } from '@/services/web/client';

type MonthsResponse = {
  data: CustomerInvoiceMonthGroup[];
  meta?: CustomerInvoiceMonthTotals;
};

type ListResponse = {
  data: CustomerInvoice[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
    month?: string | null;
  };
};

export async function fetchCustomerInvoiceMonths(
  token: string,
  options?: {
    q?: string;
    status?: string;
  },
): Promise<{ months: CustomerInvoiceMonthGroup[]; totals: CustomerInvoiceMonthTotals }> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.status) params.set('status', options.status);
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<MonthsResponse>(
    `/customer-invoices/months${query}`,
    { token },
  );
  return {
    months: response.data,
    totals: response.meta ?? {
      count: 0,
      amountUntaxed: 0,
      amountTotal: 0,
      amountDue: 0,
      currency: 'MMK',
    },
  };
}

export async function fetchCustomerInvoices(
  token: string,
  options?: {
    q?: string;
    status?: string;
    month?: string;
    limit?: number;
    offset?: number;
  },
): Promise<CustomerInvoice[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.status) params.set('status', options.status);
  if (options?.month) params.set('month', options.month);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(
    `/customer-invoices${query}`,
    { token },
  );
  return response.data;
}
