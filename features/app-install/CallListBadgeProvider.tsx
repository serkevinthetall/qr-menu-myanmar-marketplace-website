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
  fetchCallListNotInstalledCount,
} from './api';
import { ENABLE_APP_INSTALL_CALL_LIST } from './enabled';

type CallListBadgeContextValue = {
  notInstalledCount: number;
  refreshNotInstalledCount: () => Promise<void>;
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
  const [notInstalledCount, setNotInstalledCount] = useState(0);

  const refreshNotInstalledCount = useCallback(async () => {
    if (!ENABLE_APP_INSTALL_CALL_LIST || !session?.token || !isAuthenticated) {
      setNotInstalledCount(0);
      return;
    }
    try {
      const count = await fetchCallListNotInstalledCount(session.token);
      setNotInstalledCount(count);
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
      setNotInstalledCount(0);
      return;
    }

    void refreshNotInstalledCount();
    const timer = setInterval(() => {
      void refreshNotInstalledCount();
    }, POLL_MS);

    const onRefresh = () => {
      void refreshNotInstalledCount();
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
  }, [isAuthenticated, session?.token, refreshNotInstalledCount]);

  const value = useMemo(
    () => ({ notInstalledCount, refreshNotInstalledCount }),
    [notInstalledCount, refreshNotInstalledCount],
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
      notInstalledCount: 0,
      refreshNotInstalledCount: async () => undefined,
    };
  }
  return ctx;
}
