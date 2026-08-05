const ENABLED_KEY = '@qr_shop_web_online_order_alerts_enabled';
export const ONLINE_ORDER_ALERTS_EVENT = 'qr-shop-online-order-alerts-changed';
export const ONLINE_ORDERS_REFRESH_EVENT = 'qr-shop-online-orders-refresh';

export function readOnlineOrderAlertsEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(ENABLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeOnlineOrderAlertsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(ENABLED_KEY, enabled ? '1' : '0');
    window.dispatchEvent(
      new CustomEvent(ONLINE_ORDER_ALERTS_EVENT, { detail: { enabled } }),
    );
  } catch {
    // Ignore private mode / quota failures.
  }
}

/** Tell open App Order screens to reload the list. */
export function notifyOnlineOrdersRefresh(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(ONLINE_ORDERS_REFRESH_EVENT));
}
