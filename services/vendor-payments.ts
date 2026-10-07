import { VendorPayment } from '@/types/vendor-payment';
import { webApiRequest } from '@/services/web/client';

type ListResponse = {
  data: VendorPayment[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};

export async function fetchVendorPayments(
  token: string,
  options?: {
    q?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
): Promise<VendorPayment[]> {
  const params = new URLSearchParams();
  if (options?.q) params.set('q', options.q);
  if (options?.status) params.set('status', options.status);
  if (options?.limit !== undefined) params.set('limit', String(options.limit));
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<ListResponse>(
    `/vendor-payments${query}`,
    { token },
  );
  return response.data;
}
