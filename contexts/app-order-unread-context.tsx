import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { useAuth } from '@/contexts/auth-context';
import {
  fetchAppOrderUnreadCount,
  setOnlineOrderRead,
} from '@/services/online-orders';
import { ONLINE_ORDERS_REFRESH_EVENT } from '@/utils/online-order-alerts-preference';

type AppOrderUnreadContextValue = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
  markOrderReadState: (id: string, read: boolean) => Promise<void>;
};

const AppOrderUnreadContext = createContext<AppOrderUnreadContextValue | null>(
  null,
);

const POLL_MS = 30_000;

export function AppOrderUnreadProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!session?.token || !isAuthenticated) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await fetchAppOrderUnreadCount(session.token);
      setUnreadCount(count);
    } catch {
      // Keep last known count on transient errors.
    }
  }, [session?.token, isAuthenticated]);

  const markOrderReadState = useCallback(
    async (id: string, read: boolean) => {
      if (!session?.token) return;
      await setOnlineOrderRead(session.token, id, read);
      await refreshUnreadCount();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(ONLINE_ORDERS_REFRESH_EVENT));
      }
    },
    [session?.token, refreshUnreadCount],
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || !session?.token) {
      setUnreadCount(0);
      return;
    }

    void refreshUnreadCount();
    const timer = setInterval(() => {
      void refreshUnreadCount();
    }, POLL_MS);

    const onRefresh = () => {
      void refreshUnreadCount();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(ONLINE_ORDERS_REFRESH_EVENT, onRefresh);
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener(ONLINE_ORDERS_REFRESH_EVENT, onRefresh);
      }
    };
  }, [isAuthenticated, session?.token, refreshUnreadCount]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCount, markOrderReadState }),
    [unreadCount, refreshUnreadCount, markOrderReadState],
  );

  return (
    <AppOrderUnreadContext.Provider value={value}>
      {children}
    </AppOrderUnreadContext.Provider>
  );
}

export function useAppOrderUnread(): AppOrderUnreadContextValue {
  const ctx = useContext(AppOrderUnreadContext);
  if (!ctx) {
    return {
      unreadCount: 0,
      refreshUnreadCount: async () => undefined,
      markOrderReadState: async () => undefined,
    };
  }
  return ctx;
}
