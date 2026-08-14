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
  fetchMemberRequestBadgeCount,
  MEMBER_REQUEST_BADGE_REFRESH_EVENT,
} from '@/services/member-requests';

type MemberRequestBadgeContextValue = {
  requestedCount: number;
  refreshRequestedCount: () => Promise<void>;
};

const MemberRequestBadgeContext =
  createContext<MemberRequestBadgeContextValue | null>(null);

const POLL_MS = 30_000;

export function MemberRequestBadgeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, isAuthenticated } = useAuth();
  const [requestedCount, setRequestedCount] = useState(0);

  const refreshRequestedCount = useCallback(async () => {
    if (!session?.token || !isAuthenticated) {
      setRequestedCount(0);
      return;
    }
    try {
      const count = await fetchMemberRequestBadgeCount(session.token);
      setRequestedCount(count);
    } catch {
      // Keep last known count on transient errors.
    }
  }, [session?.token, isAuthenticated]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || !session?.token) {
      setRequestedCount(0);
      return;
    }

    void refreshRequestedCount();
    const timer = setInterval(() => {
      void refreshRequestedCount();
    }, POLL_MS);

    const onRefresh = () => {
      void refreshRequestedCount();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(MEMBER_REQUEST_BADGE_REFRESH_EVENT, onRefresh);
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener(MEMBER_REQUEST_BADGE_REFRESH_EVENT, onRefresh);
      }
    };
  }, [isAuthenticated, session?.token, refreshRequestedCount]);

  const value = useMemo(
    () => ({ requestedCount, refreshRequestedCount }),
    [requestedCount, refreshRequestedCount],
  );

  return (
    <MemberRequestBadgeContext.Provider value={value}>
      {children}
    </MemberRequestBadgeContext.Provider>
  );
}

export function useMemberRequestBadge(): MemberRequestBadgeContextValue {
  const ctx = useContext(MemberRequestBadgeContext);
  if (!ctx) {
    return {
      requestedCount: 0,
      refreshRequestedCount: async () => undefined,
    };
  }
  return ctx;
}
