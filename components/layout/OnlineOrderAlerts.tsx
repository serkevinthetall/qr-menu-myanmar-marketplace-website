import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';

import { useAuth } from '@/contexts/auth-context';
import { fetchOnlineOrders } from '@/services/online-orders';
import {
  ONLINE_ORDER_ALERTS_EVENT,
  notifyOnlineOrdersRefresh,
  readOnlineOrderAlertsEnabled,
} from '@/utils/online-order-alerts-preference';
import {
  isOnlineOrderAlertSoundUnlocked,
  playOnlineOrderAlertSound,
  unlockOnlineOrderAlertSound,
} from '@/utils/online-order-alert-sound';

const POLL_MS = 20_000;
const STORAGE_KEY = '@qr_shop_web_online_order_seen_ids';

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
 * Website ERP only: poll App Orders and play sound when a new one appears.
 * Controlled from Settings → App Order notifications.
 */
export function OnlineOrderAlerts() {
  const { session, isAuthenticated } = useAuth();
  const [snack, setSnack] = useState('');
  const [prefEnabled, setPrefEnabled] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    setPrefEnabled(readOnlineOrderAlertsEnabled());

    const onPref = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === 'boolean') {
        setPrefEnabled(detail.enabled);
        return;
      }
      setPrefEnabled(readOnlineOrderAlertsEnabled());
    };
    window.addEventListener(ONLINE_ORDER_ALERTS_EVENT, onPref);
    return () => window.removeEventListener(ONLINE_ORDER_ALERTS_EVENT, onPref);
  }, []);

  // If preference is on, unlock audio on the next user gesture (needed after refresh).
  useEffect(() => {
    if (Platform.OS !== 'web' || !prefEnabled || typeof window === 'undefined') {
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
  }, [prefEnabled]);

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      !isAuthenticated ||
      !session?.token ||
      !prefEnabled
    ) {
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
        const rows = await fetchOnlineOrders(session.token, { limit: 100 });
        if (cancelled) {
          return;
        }
        const nextIds = new Set(rows.map(row => row.id));
        if (!readyRef.current) {
          seenRef.current = nextIds;
          writeSeenIds(nextIds);
          readyRef.current = true;
          return;
        }

        const newcomers = [...nextIds].filter(id => !seenRef.current.has(id));
        if (newcomers.length > 0) {
          for (const id of nextIds) {
            seenRef.current.add(id);
          }
          writeSeenIds(seenRef.current);
          if (isOnlineOrderAlertSoundUnlocked()) {
            playOnlineOrderAlertSound();
          }
          notifyOnlineOrdersRefresh();
          const label =
            newcomers.length === 1
              ? 'New App Order received'
              : `${newcomers.length} new App Orders received`;
          setSnack(label);
        }
      } catch {
        // Stay quiet on transient API errors.
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
  }, [isAuthenticated, session?.token, prefEnabled]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Portal>
      <Snackbar
        visible={Boolean(snack)}
        onDismiss={() => setSnack('')}
        duration={5000}
        action={{
          label: 'OK',
          onPress: () => setSnack(''),
        }}>
        {snack}
      </Snackbar>
    </Portal>
  );
}
