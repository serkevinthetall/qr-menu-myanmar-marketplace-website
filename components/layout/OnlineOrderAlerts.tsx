import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';

import { useAuth } from '@/contexts/auth-context';
import { useVisibleInterval } from '@/hooks/use-visible-interval';
import { APP_ORDER_ALERT_POLL_MS } from '@/services/badges';
import { fetchOnlineOrderNotifyFeed } from '@/services/online-orders';
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

const REVISION_KEY = '@qr_shop_web_online_order_notify_rev';

function readRevision(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.sessionStorage.getItem(REVISION_KEY);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeRevision(revision: number) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(REVISION_KEY, String(revision));
  } catch {
    // Ignore quota / private mode failures.
  }
}

/**
 * Website ERP: listen for Odoo webhook events via cheap notify-feed.
 * Falls back quietly when the webhook bus is not active yet.
 */
export function OnlineOrderAlerts() {
  const { session, isAuthenticated } = useAuth();
  const [snack, setSnack] = useState('');
  const [prefEnabled, setPrefEnabled] = useState(false);
  const revisionRef = useRef(0);
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
    revisionRef.current = readRevision();
    readyRef.current = revisionRef.current > 0;
  }, [isAuthenticated, session?.token, prefEnabled]);

  const poll = () => {
    if (!session?.token) return;
    void (async () => {
      try {
        const feed = await fetchOnlineOrderNotifyFeed(
          session.token,
          revisionRef.current,
        );

        if (!readyRef.current) {
          // Baseline — do not alert on historical backlog.
          revisionRef.current = feed.revision;
          writeRevision(feed.revision);
          readyRef.current = true;
          return;
        }

        if (feed.revision > revisionRef.current) {
          revisionRef.current = feed.revision;
          writeRevision(feed.revision);
        }

        if (feed.events.length === 0) {
          return;
        }

        if (isOnlineOrderAlertSoundUnlocked()) {
          playOnlineOrderAlertSound();
        }
        notifyOnlineOrdersRefresh();
        const first = feed.events[feed.events.length - 1];
        const label =
          feed.events.length === 1
            ? first?.number
              ? `New App Order ${first.number}`
              : 'New App Order received'
            : `${feed.events.length} new App Orders received`;
        setSnack(label);
      } catch {
        // Stay quiet on transient API errors.
      }
    })();
  };

  useVisibleInterval(
    poll,
    APP_ORDER_ALERT_POLL_MS,
    Platform.OS === 'web' &&
      Boolean(isAuthenticated && session?.token && prefEnabled),
  );

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
