import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';

import { useAuth } from '@/contexts/auth-context';
import { useVisibleInterval } from '@/hooks/use-visible-interval';
import {
  fetchMemberRequests,
  notifyMemberRequestBadgeChanged,
} from '@/services/member-requests';
import { ERP_BADGE_POLL_MS } from '@/services/badges';
import {
  playSoundForNotifyPopup,
  preloadOnlineOrderAlertSound,
  unlockOnlineOrderAlertSound,
} from '@/utils/online-order-alert-sound';
import {
  ONLINE_ORDER_ALERTS_EVENT,
  ensureOnlineOrderAlertsEnabledDefault,
  readOnlineOrderAlertsEnabled,
} from '@/utils/online-order-alerts-preference';

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
 * Poll Requested member applications every 60s while the tab is visible.
 * Snackbar always shows for new rows; sound follows Settings → notifications.
 */
export function MemberRequestAlerts() {
  const { session, isAuthenticated } = useAuth();
  const [snack, setSnack] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(() =>
    Platform.OS === 'web' ? readOnlineOrderAlertsEnabled() : false,
  );
  const soundEnabledRef = useRef(soundEnabled);
  const seenRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    setSoundEnabled(ensureOnlineOrderAlertsEnabledDefault());
    preloadOnlineOrderAlertSound();

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
    if (Platform.OS !== 'web' || !isAuthenticated || typeof window === 'undefined') {
      return;
    }
    const unlock = () => {
      // Silent only — must not beep on every Settings / UI click.
      void unlockOnlineOrderAlertSound();
    };
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || !session?.token) {
      return;
    }
    seenRef.current = readSeenIds();
    readyRef.current = seenRef.current.size > 0;
  }, [isAuthenticated, session?.token]);

  const poll = () => {
    if (!session?.token) return;
    void (async () => {
      try {
        const rows = await fetchMemberRequests(session.token, {
          status: 'Requested',
          limit: 50,
        });
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
          const first = fresh[0];
          const label =
            fresh.length === 1
              ? `New member request: ${first.name || first.customer || first.phone || first.id}`
              : `${fresh.length} new member requests`;
          // Popup + sound together (same trigger as App Order alerts).
          setSnack(label);
          if (soundEnabledRef.current) {
            void playSoundForNotifyPopup();
          }
        } else {
          seenRef.current = nextIds;
          writeSeenIds(nextIds);
        }
      } catch {
        // Ignore transient poll failures.
      }
    })();
  };

  useVisibleInterval(
    poll,
    ERP_BADGE_POLL_MS,
    Platform.OS === 'web' && Boolean(isAuthenticated && session?.token),
  );

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
