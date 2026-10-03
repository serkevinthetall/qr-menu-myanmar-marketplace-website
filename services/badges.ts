import { webApiRequest } from '@/services/web/client';

export type ErpBadges = {
  memberRequestCount: number;
  appOrderUnreadCount: number;
  callListNewCount: number;
};

type BadgesResponse = {
  data: {
    memberRequestCount?: number;
    appOrderUnreadCount?: number;
    callListNewCount?: number;
  };
};

/** Shared sidebar/header badge payload — prefer over three separate polls. */
export async function fetchErpBadges(token: string): Promise<ErpBadges> {
  const response = await webApiRequest<BadgesResponse>('/badges', { token });
  return {
    memberRequestCount: Number(response.data?.memberRequestCount) || 0,
    appOrderUnreadCount: Number(response.data?.appOrderUnreadCount) || 0,
    callListNewCount: Number(response.data?.callListNewCount) || 0,
  };
}

/** Sidebar badge poll interval when the ERP tab is visible. */
export const ERP_BADGE_POLL_MS = 60_000;

/**
 * App Order sound/snackbar — polls cheap Redis notify-feed (Odoo webhook).
 * Keep short so staff hear new orders quickly without hitting Odoo.
 */
export const APP_ORDER_ALERT_POLL_MS = 8_000;

/**
 * App Orders page list refresh when the tab is visible.
 * Slowed down: webhook notify-feed triggers an immediate refresh on new orders.
 */
export const APP_ORDER_LIST_POLL_MS = 120_000;
