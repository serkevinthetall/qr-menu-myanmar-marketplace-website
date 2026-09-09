import type { ReactNode } from 'react';

import {
  ErpBadgesProvider,
  useAppOrderUnreadFromBadges,
} from '@/contexts/erp-badges-context';

type AppOrderUnreadContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markOrderReadState: (id: string, read: boolean) => Promise<void>;
};

/** Thin wrapper — polling lives in ErpBadgesProvider (merged /api/badges). */
export function AppOrderUnreadProvider({ children }: { children: ReactNode }) {
  return <ErpBadgesProvider>{children}</ErpBadgesProvider>;
}

export function useAppOrderUnread(): AppOrderUnreadContextValue {
  return useAppOrderUnreadFromBadges();
}
