/** @temp-feature app-install-call-list — independent of App Order unread badges */
import type { ReactNode } from 'react';

import { useCallListBadgeFromBadges } from '@/contexts/erp-badges-context';
import { ENABLE_APP_INSTALL_CALL_LIST } from './enabled';

type CallListBadgeContextValue = {
  newCount: number;
  refreshNewCount: () => Promise<void>;
};

/** Counts come from ErpBadgesProvider — no separate poller. */
export function CallListBadgeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useCallListBadge(): CallListBadgeContextValue {
  const badges = useCallListBadgeFromBadges();
  if (!ENABLE_APP_INSTALL_CALL_LIST) {
    return {
      newCount: 0,
      refreshNewCount: async () => undefined,
    };
  }
  return badges;
}
