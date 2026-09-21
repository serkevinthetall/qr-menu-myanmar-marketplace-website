import { Href, Router } from 'expo-router';

import {
  DeliveryOrderSource,
  firstParam,
  navigateBackToOrderDetail,
  parseDeliveryOrderSource,
} from '@/utils/order-delivery-nav';

export type InvoiceOrderSource = DeliveryOrderSource;

export const parseInvoiceOrderSource = parseDeliveryOrderSource;
export { firstParam, navigateBackToOrderDetail };

type NavRouter = Pick<Router, 'push' | 'replace' | 'navigate'> & {
  dismissTo?: (href: Href) => void;
};

function go(router: NavRouter, href: Href) {
  if (typeof router.dismissTo === 'function') {
    try {
      router.dismissTo(href);
      return;
    } catch {
      // Fall through when the target is not on the stack.
    }
  }
  router.navigate(href);
}

export function pushOrderInvoices(
  router: Pick<Router, 'push'>,
  params: {
    source: InvoiceOrderSource;
    orderId: string;
    orderNumber?: string;
  },
) {
  router.push({
    pathname: '/(drawer)/order-invoices',
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
    pathname: '/(drawer)/order-invoice-detail',
    params: {
      source: params.source,
      orderId: params.orderId,
      invoiceId: params.invoiceId,
      orderNumber: params.orderNumber ?? '',
    },
  });
}

export function navigateBackToOrderInvoices(
  router: NavRouter,
  params: {
    source: InvoiceOrderSource;
    orderId: string;
    orderNumber?: string;
  },
) {
  go(router, {
    pathname: '/(drawer)/order-invoices',
    params: {
      source: params.source,
      orderId: params.orderId,
      orderNumber: params.orderNumber ?? '',
    },
  });
}
