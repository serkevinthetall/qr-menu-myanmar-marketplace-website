import { Router } from 'expo-router';

import {
  DeliveryOrderSource,
  firstParam,
  parseDeliveryOrderSource,
} from '@/utils/order-delivery-nav';

export type InvoiceOrderSource = DeliveryOrderSource;

export const parseInvoiceOrderSource = parseDeliveryOrderSource;
export { firstParam };

export function pushOrderInvoices(
  router: Pick<Router, 'push'>,
  params: {
    source: InvoiceOrderSource;
    orderId: string;
    orderNumber?: string;
  },
) {
  router.push({
    pathname: '/order-invoices' as any,
    params: {
      source: params.source,
      orderId: params.orderId,
      orderNumber: params.orderNumber ?? '',
    },
  });
}

export function pushOrderInvoiceDetail(
  router: Pick<Router, 'push'>,
  params: {
    source: InvoiceOrderSource;
    orderId: string;
    invoiceId: string;
    orderNumber?: string;
  },
) {
  router.push({
    pathname: '/order-invoice-detail' as any,
    params: {
      source: params.source,
      orderId: params.orderId,
      invoiceId: params.invoiceId,
      orderNumber: params.orderNumber ?? '',
    },
  });
}
