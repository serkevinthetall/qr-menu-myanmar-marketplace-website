import { apiRequest } from '@/services/api';
import { QuotationDraft } from '@/components/quotation/QuotationBuilder';
import { PaymentMethod, Quotation, QuotationDetail } from '@/types/quotation';

type QuotationsResponse = {
  data: Quotation[];
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

export async function fetchQuotations(token: string): Promise<Quotation[]> {
  const response = await apiRequest<QuotationsResponse>('/quotations', { token });
  return response.data;
}

export async function fetchQuotationDetail(
  token: string,
  id: string,
): Promise<QuotationDetail> {
  const response = await apiRequest<QuotationDetailResponse>(`/quotations/${id}`, {
    token,
  });
  return response.data;
}

export async function fetchPaymentMethods(token: string): Promise<PaymentMethod[]> {
  const response = await apiRequest<PaymentMethodsResponse>(
    '/quotations/payment-methods',
    { token },
  );
  return response.data;
}

export async function createQuotation(
  token: string,
  draft: QuotationDraft,
): Promise<Quotation> {
  const response = await apiRequest<CreateQuotationResponse>('/quotations', {
    method: 'POST',
    token,
    body: {
      customerId: draft.customer.id,
      shippingPartnerId: draft.shippingPartnerId || draft.customer.id,
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
