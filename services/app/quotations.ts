import { Quotation, QuotationDetail } from '@/types/quotation';
import { appApiRequest } from '@/services/app/client';

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
  const response = await appApiRequest<ListResponse>(`/quotations${query}`, {
    token,
  });
  return response.data;
}

export async function fetchAppQuotationDetail(
  token: string,
  id: string,
): Promise<QuotationDetail> {
  const response = await appApiRequest<DetailResponse>(`/quotations/${id}`, {
    token,
  });
  return response.data;
}

export async function cancelAppQuotation(
  token: string,
  id: string,
): Promise<QuotationDetail> {
  const response = await appApiRequest<DetailResponse>(`/quotations/${id}/cancel`, {
    method: 'POST',
    token,
  });
  return response.data;
}

export async function fetchAppPaymentMethods(
  token: string,
): Promise<{ id: string; name: string }[]> {
  const response = await appApiRequest<PaymentMethodsResponse>(
    '/quotations/payment-methods',
    { token },
  );
  return response.data;
}

export async function createAppQuotation(
  token: string,
  input: AppCreateQuotationInput,
): Promise<Quotation> {
  const response = await appApiRequest<CreateResponse>('/quotations', {
    method: 'POST',
    token,
    body: input,
  });
  return response.data;
}
