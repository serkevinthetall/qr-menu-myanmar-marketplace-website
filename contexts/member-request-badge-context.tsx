import type { ReactNode } from 'react';

import { useMemberRequestBadgeFromBadges } from '@/contexts/erp-badges-context';

type MemberRequestBadgeContextValue = {
  requestedCount: number;
  refreshRequestedCount: () => Promise<void>;
};

/** Counts come from ErpBadgesProvider — no separate poller. */
export function MemberRequestBadgeProvider({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}

export function useMemberRequestBadge(): MemberRequestBadgeContextValue {
  return useMemberRequestBadgeFromBadges();
}
