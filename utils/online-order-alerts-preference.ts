const ENABLED_KEY = '@qr_shop_web_online_order_alerts_enabled';
export const ONLINE_ORDER_ALERTS_EVENT = 'qr-shop-online-order-alerts-changed';
export const ONLINE_ORDERS_REFRESH_EVENT = 'qr-shop-online-orders-refresh';
/** Fired when Redis notify-wait receives a new App Order (all logged-in tabs). */
export const APP_ORDER_NOTIFY_EVENT = 'qr-shop-app-order-notify';

export type AppOrderNotifyEventDetail = {
  unreadCount: number;
  revision: number;
  label: string;
  /** How many new notify events arrived in this batch (for optimistic badge). */
  newEventCount?: number;
};

export function readOnlineOrderAlertsEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const raw = window.localStorage.getItem(ENABLED_KEY);
    // Default ON so snackbar + sound stay paired until user mutes in Settings.
    if (raw === null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

/** Persist default ON once so Settings switch and notify sound stay in sync. */
export function ensureOnlineOrderAlertsEnabledDefault(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    if (window.localStorage.getItem(ENABLED_KEY) === null) {
      writeOnlineOrderAlertsEnabled(true);
      return true;
    }
  } catch {
    // ignore
  }
  return readOnlineOrderAlertsEnabled();
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

/** Badge (+ optional snackbar) bus for webhook-driven App Orders. */
export function notifyAppOrderNotify(
  detail: AppOrderNotifyEventDetail,
  options?: { refreshList?: boolean },
): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(APP_ORDER_NOTIFY_EVENT, { detail }),
  );
  if (options?.refreshList && detail.label) {
    notifyOnlineOrdersRefresh();
  }
}
