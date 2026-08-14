import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';

import { useAuth } from '@/contexts/auth-context';
import {
  fetchMemberRequests,
  notifyMemberRequestBadgeChanged,
} from '@/services/member-requests';
import {
  isOnlineOrderAlertSoundUnlocked,
  playOnlineOrderAlertSound,
  unlockOnlineOrderAlertSound,
} from '@/utils/online-order-alert-sound';
import {
  ONLINE_ORDER_ALERTS_EVENT,
  readOnlineOrderAlertsEnabled,
} from '@/utils/online-order-alerts-preference';

const POLL_MS = 20_000;
const STORAGE_KEY = '@qr_shop_web_member_request_seen_ids';

function readSeenIds(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.map(id => String(id)));
  } catch {
    return new Set();
  }
}

function writeSeenIds(ids: Set<string>) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const list = [...ids].slice(-500);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore quota / private mode failures.
  }
}

/**
 * Always poll Requested member applications.
 * Snackbar always shows for new rows; sound follows Settings → notifications.
 */
export function MemberRequestAlerts() {
  const { session, isAuthenticated } = useAuth();
  const [snack, setSnack] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    setSoundEnabled(readOnlineOrderAlertsEnabled());

    const onPref = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === 'boolean') {
        setSoundEnabled(detail.enabled);
        return;
      }
      setSoundEnabled(readOnlineOrderAlertsEnabled());
    };
    window.addEventListener(ONLINE_ORDER_ALERTS_EVENT, onPref);
    return () => window.removeEventListener(ONLINE_ORDER_ALERTS_EVENT, onPref);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !soundEnabled || typeof window === 'undefined') {
      return;
    }
    if (isOnlineOrderAlertSoundUnlocked()) {
      return;
    }
    const unlock = () => {
      void unlockOnlineOrderAlertSound();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [soundEnabled]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || !session?.token) {
      return;
    }

    seenRef.current = readSeenIds();
    readyRef.current = seenRef.current.size > 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || !session.token) {
        return;
      }
      try {
        const rows = await fetchMemberRequests(session.token, {
          status: 'Requested',
          limit: 100,
        });
        if (cancelled) {
          return;
        }
        const nextIds = new Set(rows.map(row => row.id));
        if (!readyRef.current) {
          seenRef.current = nextIds;
          writeSeenIds(nextIds);
          readyRef.current = true;
          notifyMemberRequestBadgeChanged();
          return;
        }

        const fresh = rows.filter(row => !seenRef.current.has(row.id));
        if (fresh.length > 0) {
          seenRef.current = new Set([...seenRef.current, ...nextIds]);
          writeSeenIds(seenRef.current);
          notifyMemberRequestBadgeChanged();
          if (soundEnabled) {
            void playOnlineOrderAlertSound();
          }
          const first = fresh[0];
          const label = first.name || first.customer || first.phone || first.id;
          setSnack(
            fresh.length === 1
              ? `New member request: ${label}`
              : `${fresh.length} new member requests`,
          );
        } else {
          seenRef.current = nextIds;
          writeSeenIds(nextIds);
          notifyMemberRequestBadgeChanged();
        }
      } catch {
        // Ignore transient poll failures.
      }
    };

    void poll();
    const timer = setInterval(() => {
      void poll();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isAuthenticated, session?.token, soundEnabled]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Portal>
      <Snackbar
        visible={Boolean(snack)}
        onDismiss={() => setSnack('')}
        duration={6000}
        action={{ label: 'OK', onPress: () => setSnack('') }}>
        {snack}
      </Snackbar>
    </Portal>
  );
}
