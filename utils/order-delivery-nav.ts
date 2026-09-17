import { Router } from 'expo-router';

export type DeliveryOrderSource =
  | 'sale-orders'
  | 'online-orders'
  | 'quotations'
  | 'app-quotations';

export function parseDeliveryOrderSource(
  raw?: string | string[],
): DeliveryOrderSource {
  const value = Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '');
  if (
    value === 'online-orders' ||
    value === 'quotations' ||
    value === 'app-quotations'
  ) {
    return value;
  }
  return 'sale-orders';
}

export function firstParam(raw?: string | string[]): string {
  return Array.isArray(raw) ? String(raw[0] ?? '') : String(raw ?? '');
}

export function pushOrderDeliveries(
  router: Pick<Router, 'push'>,
  params: {
    source: DeliveryOrderSource;
    orderId: string;
    orderNumber?: string;
  },
) {
  router.push({
    pathname: '/order-deliveries' as any,
    params: {
      source: params.source,
      orderId: params.orderId,
      orderNumber: params.orderNumber ?? '',
    },
  });
}

export function pushOrderDeliveryDetail(
  router: Pick<Router, 'push'>,
  params: {
    source: DeliveryOrderSource;
    orderId: string;
    pickingId: string;
    orderNumber?: string;
  },
) {
  router.push({
    pathname: '/order-delivery-detail' as any,
    params: {
      source: params.source,
      orderId: params.orderId,
      pickingId: params.pickingId,
      orderNumber: params.orderNumber ?? '',
    },
  });
}
