import { apiRequest } from '@/services/api';
import { Quotation, QuotationDetail } from '@/types/quotation';

type ListResponse = { data: Quotation[] };
type DetailResponse = { data: QuotationDetail };
type CreateResponse = { data: Quotation };
type PaymentMethodsResponse = { data: { id: string; name: string }[] };

export type AppCreateQuotationInput = {
  customerId: string;
  shippingPartnerId: string;
  salePersonName: string;
  deliveryNote: string;
  preferredDeliveryDate: string;
  phoneNumber?: string;
  paymentMethodLineId: string;
  lines: {
    productId: string;
    quantity: number;
    unitPrice: number;
    discountPercent?: number;
  }[];
};

export async function fetchAppQuotations(
  token: string,
  options?: { q?: string },
): Promise<Quotation[]> {
  const query = options?.q ? `?q=${encodeURIComponent(options.q)}` : '';
  const response = await apiRequest<ListResponse>(`/app/quotations${query}`, {
    token,
  });
  return response.data;
}

export async function fetchAppQuotationDetail(
  token: string,
  id: string,
): Promise<QuotationDetail> {
  const response = await apiRequest<DetailResponse>(`/app/quotations/${id}`, {
    token,
  });
  return response.data;
}

export async function fetchAppPaymentMethods(
  token: string,
): Promise<{ id: string; name: string }[]> {
  const response = await apiRequest<PaymentMethodsResponse>(
    '/app/quotations/payment-methods',
    { token },
  );
  return response.data;
}

export async function createAppQuotation(
  token: string,
  input: AppCreateQuotationInput,
): Promise<Quotation> {
  const response = await apiRequest<CreateResponse>('/app/quotations', {
    method: 'POST',
    token,
    body: input,
  });
  return response.data;
}
