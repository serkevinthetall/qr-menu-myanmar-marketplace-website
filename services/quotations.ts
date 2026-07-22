import { webApiRequest } from '@/services/web/client';
import { QuotationDraft } from '@/components/quotation/QuotationBuilder';
import { PaymentMethod, Quotation, QuotationDetail } from '@/types/quotation';

type QuotationsResponse = {
  data: Quotation[];
  meta?: {
    limit: number;
    offset: number;
    count: number;
    hasMore: boolean;
  };
};

type QuotationDetailResponse = {
  data: QuotationDetail;
};

type CreateQuotationResponse = {
  data: Quotation;
};

type PaymentMethodsResponse = {
  data: PaymentMethod[];
};

export type QuotationsPage = {
  data: Quotation[];
  hasMore: boolean;
  offset: number;
  limit: number;
};

export async function fetchQuotationsPage(
  token: string,
  options?: { limit?: number; offset?: number },
): Promise<QuotationsPage> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) {
    params.set('limit', String(options.limit));
  }
  if (options?.offset !== undefined) {
    params.set('offset', String(options.offset));
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await webApiRequest<QuotationsResponse>(`/quotations${query}`, {
    token,
  });
  const limit = options?.limit ?? response.meta?.limit ?? response.data.length;
  const offset = options?.offset ?? response.meta?.offset ?? 0;
  return {
    data: response.data,
    hasMore: response.meta?.hasMore ?? false,
    offset,
    limit,
  };
}

/** Loads every quotation page into memory (for local search). */
export async function fetchQuotations(token: string): Promise<Quotation[]> {
  const pageSize = 200;
  let offset = 0;
  let all: Quotation[] = [];
  let hasMore = true;

  while (hasMore) {
    const page = await fetchQuotationsPage(token, { limit: pageSize, offset });
    all = all.concat(page.data);
    hasMore = page.hasMore && page.data.length > 0;
    offset += page.data.length;
    if (page.data.length === 0) break;
  }

  return all;
}

export async function fetchQuotationDetail(
  token: string,
  id: string,
): Promise<QuotationDetail> {
  const response = await webApiRequest<QuotationDetailResponse>(`/quotations/${id}`, {
    token,
  });
  return response.data;
}

export async function cancelQuotation(
  token: string,
  id: string,
): Promise<QuotationDetail> {
  const response = await webApiRequest<QuotationDetailResponse>(
    `/quotations/${id}/cancel`,
    { method: 'POST', token },
  );
  return response.data;
}

export async function fetchPaymentMethods(token: string): Promise<PaymentMethod[]> {
  const response = await webApiRequest<PaymentMethodsResponse>(
    '/quotations/payment-methods',
    { token },
  );
  return response.data;
}

export async function createQuotation(
  token: string,
  draft: QuotationDraft,
): Promise<Quotation> {
  const response = await webApiRequest<CreateQuotationResponse>('/quotations', {
    method: 'POST',
    token,
    body: {
      customerId: draft.customer.id,
      shippingPartnerId: draft.shippingPartnerId,
      salePersonName: draft.salePersonName,
      deliveryNote: draft.deliveryNote,
      preferredDeliveryDate: draft.preferredDeliveryDate,
      phoneNumber: draft.phoneNumber,
      paymentMethodLineId: draft.paymentMethodLineId,
      lines: draft.lines.map(line => ({
        productId: line.product.id,
        quantity: line.qty,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent,
      })),
    },
  });
  return response.data;
}
