import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/contexts/auth-context';
import { ENABLE_APP_INSTALL_CALL_LIST } from '@/features/app-install/enabled';
import { useVisibleInterval } from '@/hooks/use-visible-interval';
import { ERP_BADGE_POLL_MS, fetchErpBadges } from '@/services/badges';
import { CALL_LIST_BADGE_REFRESH_EVENT } from '@/features/app-install/api';
import { MEMBER_REQUEST_BADGE_REFRESH_EVENT } from '@/services/member-requests';
import { setOnlineOrderRead } from '@/services/online-orders';
import { ONLINE_ORDERS_REFRESH_EVENT } from '@/utils/online-order-alerts-preference';

type ErpBadgesContextValue = {
  memberRequestCount: number;
  appOrderUnreadCount: number;
  callListNewCount: number;
  refreshBadges: () => Promise<void>;
  markOrderReadState: (id: string, read: boolean) => Promise<void>;
};

const ErpBadgesContext = createContext<ErpBadgesContextValue | null>(null);

/**
 * Single 60s (visible-tab) poll for all ERP sidebar badges.
 * Replaces three independent 20–30s pollers.
 */
export function ErpBadgesProvider({ children }: { children: React.ReactNode }) {
  const { session, isAuthenticated } = useAuth();
  const [memberRequestCount, setMemberRequestCount] = useState(0);
  const [appOrderUnreadCount, setAppOrderUnreadCount] = useState(0);
  const [callListNewCount, setCallListNewCount] = useState(0);

  const refreshBadges = useCallback(async () => {
    if (!session?.token || !isAuthenticated) {
      setMemberRequestCount(0);
      setAppOrderUnreadCount(0);
      setCallListNewCount(0);
      return;
    }
    try {
      const badges = await fetchErpBadges(session.token);
      setMemberRequestCount(badges.memberRequestCount);
      setAppOrderUnreadCount(badges.appOrderUnreadCount);
      setCallListNewCount(
        ENABLE_APP_INSTALL_CALL_LIST ? badges.callListNewCount : 0,
      );
    } catch {
      // Keep last known counts on transient errors.
    }
  }, [session?.token, isAuthenticated]);

  const markOrderReadState = useCallback(
    async (id: string, read: boolean) => {
      if (!session?.token) return;
      // Optimistic bell count — survives until /api/badges refresh catches up.
      setAppOrderUnreadCount(prev =>
        read ? Math.max(0, prev - 1) : prev + 1,
      );
      try {
        await setOnlineOrderRead(session.token, id, read);
        await refreshBadges();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event(ONLINE_ORDERS_REFRESH_EVENT));
        }
      } catch (error) {
        await refreshBadges();
        throw error;
      }
    },
    [session?.token, refreshBadges],
  );

  const enabled =
    Platform.OS === 'web' && Boolean(isAuthenticated && session?.token);

  useVisibleInterval(refreshBadges, ERP_BADGE_POLL_MS, enabled);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }
    const onRefresh = () => {
      void refreshBadges();
    };
    window.addEventListener(ONLINE_ORDERS_REFRESH_EVENT, onRefresh);
    window.addEventListener(MEMBER_REQUEST_BADGE_REFRESH_EVENT, onRefresh);
    window.addEventListener(CALL_LIST_BADGE_REFRESH_EVENT, onRefresh);
    return () => {
      window.removeEventListener(ONLINE_ORDERS_REFRESH_EVENT, onRefresh);
      window.removeEventListener(MEMBER_REQUEST_BADGE_REFRESH_EVENT, onRefresh);
      window.removeEventListener(CALL_LIST_BADGE_REFRESH_EVENT, onRefresh);
    };
  }, [enabled, refreshBadges]);

  const value = useMemo(
    () => ({
      memberRequestCount,
      appOrderUnreadCount,
      callListNewCount,
      refreshBadges,
      markOrderReadState,
    }),
    [
      memberRequestCount,
      appOrderUnreadCount,
      callListNewCount,
      refreshBadges,
      markOrderReadState,
    ],
  );

  return (
    <ErpBadgesContext.Provider value={value}>{children}</ErpBadgesContext.Provider>
  );
}

function useErpBadges(): ErpBadgesContextValue {
  const ctx = useContext(ErpBadgesContext);
  if (!ctx) {
    return {
      memberRequestCount: 0,
      appOrderUnreadCount: 0,
      callListNewCount: 0,
      refreshBadges: async () => undefined,
      markOrderReadState: async () => undefined,
    };
  }
  return ctx;
}

/** @deprecated Prefer useErpBadges internals via existing hook names. */
export function useAppOrderUnreadFromBadges() {
  const { appOrderUnreadCount, refreshBadges, markOrderReadState } =
    useErpBadges();
  return {
    unreadCount: appOrderUnreadCount,
    refreshUnreadCount: refreshBadges,
    markOrderReadState,
  };
}

export function useMemberRequestBadgeFromBadges() {
  const { memberRequestCount, refreshBadges } = useErpBadges();
  return {
    requestedCount: memberRequestCount,
    refreshRequestedCount: refreshBadges,
  };
}

export function useCallListBadgeFromBadges() {
  const { callListNewCount, refreshBadges } = useErpBadges();
  return {
    newCount: callListNewCount,
    refreshNewCount: refreshBadges,
  };
}

export { useErpBadges };
