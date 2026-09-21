import { Href, Router } from 'expo-router';

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

type NavRouter = Pick<Router, 'push' | 'replace' | 'navigate'> & {
  dismissTo?: (href: Href) => void;
};

function go(router: NavRouter, href: Href) {
  // Drawer + replace('/') remounts with initialRouteName "overview".
  // Prefer dismissTo / navigate with explicit /(drawer)/… paths.
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

function orderDetailHref(
  source: DeliveryOrderSource,
  orderId: string,
): Href {
  if (source === 'online-orders') {
    return {
      pathname: '/(drawer)/online-orders',
      params: { detailId: orderId },
    };
  }
  if (source === 'quotations') {
    return {
      pathname: '/(drawer)/index',
      params: { detailId: orderId },
    };
  }
  if (source === 'app-quotations') {
    return {
      pathname: '/(app)/quotations/[id]',
      params: { id: orderId },
    };
  }
  return {
    pathname: '/(drawer)/sale-orders',
    params: { detailId: orderId },
  };
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
    pathname: '/(drawer)/order-deliveries',
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
    pathname: '/(drawer)/order-delivery-detail',
    params: {
      source: params.source,
      orderId: params.orderId,
      pickingId: params.pickingId,
      orderNumber: params.orderNumber ?? '',
    },
  });
}

/** Back from delivery/invoice list → parent order detail (never Overview). */
export function navigateBackToOrderDetail(
  router: NavRouter,
  params: {
    source: DeliveryOrderSource;
    orderId: string;
  },
) {
  const orderId = params.orderId.trim();
  if (!orderId) {
    go(router, '/(drawer)/sale-orders');
    return;
  }
  go(router, orderDetailHref(params.source, orderId));
}

/** Back from delivery detail → deliveries list for the same order. */
export function navigateBackToOrderDeliveries(
  router: NavRouter,
  params: {
    source: DeliveryOrderSource;
    orderId: string;
    orderNumber?: string;
  },
) {
  go(router, {
    pathname: '/(drawer)/order-deliveries',
    params: {
      source: params.source,
      orderId: params.orderId,
      orderNumber: params.orderNumber ?? '',
    },
  });
}
