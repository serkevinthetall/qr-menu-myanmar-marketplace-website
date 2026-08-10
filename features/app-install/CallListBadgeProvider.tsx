/** @temp-feature app-install-call-list — independent of App Order unread badges */
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

import {
  CALL_LIST_BADGE_REFRESH_EVENT,
  fetchCallListNewCount,
} from './api';
import { ENABLE_APP_INSTALL_CALL_LIST } from './enabled';

type CallListBadgeContextValue = {
  newCount: number;
  refreshNewCount: () => Promise<void>;
};

const CallListBadgeContext = createContext<CallListBadgeContextValue | null>(
  null,
);

const POLL_MS = 30_000;

export function CallListBadgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, isAuthenticated } = useAuth();
  const [newCount, setNewCount] = useState(0);

  const refreshNewCount = useCallback(async () => {
    if (!ENABLE_APP_INSTALL_CALL_LIST || !session?.token || !isAuthenticated) {
      setNewCount(0);
      return;
    }
    try {
      const count = await fetchCallListNewCount(session.token);
      setNewCount(count);
    } catch {
      // Keep last known count on transient errors.
    }
  }, [session?.token, isAuthenticated]);

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      !ENABLE_APP_INSTALL_CALL_LIST ||
      !isAuthenticated ||
      !session?.token
    ) {
      setNewCount(0);
      return;
    }

    void refreshNewCount();
    const timer = setInterval(() => {
      void refreshNewCount();
    }, POLL_MS);

    const onRefresh = () => {
      void refreshNewCount();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(CALL_LIST_BADGE_REFRESH_EVENT, onRefresh);
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener(CALL_LIST_BADGE_REFRESH_EVENT, onRefresh);
      }
    };
  }, [isAuthenticated, session?.token, refreshNewCount]);

  const value = useMemo(
    () => ({ newCount, refreshNewCount }),
    [newCount, refreshNewCount],
  );

  return (
    <CallListBadgeContext.Provider value={value}>
      {children}
    </CallListBadgeContext.Provider>
  );
}

export function useCallListBadge(): CallListBadgeContextValue {
  const ctx = useContext(CallListBadgeContext);
  if (!ctx) {
    return {
      newCount: 0,
      refreshNewCount: async () => undefined,
    };
  }
  return ctx;
}
