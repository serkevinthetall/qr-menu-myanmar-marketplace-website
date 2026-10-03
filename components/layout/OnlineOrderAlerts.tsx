import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';

import { useAuth } from '@/contexts/auth-context';
import {
  fetchOnlineOrderNotifyFeed,
  waitOnlineOrderNotifyFeed,
} from '@/services/online-orders';
import {
  APP_ORDER_NOTIFY_EVENT,
  ONLINE_ORDER_ALERTS_EVENT,
  notifyAppOrderNotify,
  readOnlineOrderAlertsEnabled,
} from '@/utils/online-order-alerts-preference';
import {
  isOnlineOrderAlertSoundUnlocked,
  playOnlineOrderAlertSound,
  unlockOnlineOrderAlertSound,
} from '@/utils/online-order-alert-sound';

const REVISION_KEY = '@qr_shop_web_online_order_notify_rev';
const WAIT_MS = 8_000;

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

function isTabVisible(): boolean {
  if (typeof document === 'undefined') return true;
  return document.visibilityState !== 'hidden';
}

/**
 * Website ERP: long-poll Redis notify bus (filled by Odoo webhook).
 * Popup + badge update for every logged-in user; sound stays Settings-gated.
 */
export function OnlineOrderAlerts() {
  const { session, isAuthenticated } = useAuth();
  const [snack, setSnack] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const revisionRef = useRef(0);
  const readyRef = useRef(false);
  const token = session?.token;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
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
    if (isOnlineOrderAlertSoundUnlocked()) return;
    const unlock = () => {
      void unlockOnlineOrderAlertSound();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, [soundEnabled]);

  // Also show snackbar when another listener (or same tab) broadcasts.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onNotify = (event: Event) => {
      const detail = (event as CustomEvent<{ label?: string }>).detail;
      if (detail?.label) setSnack(detail.label);
    };
    window.addEventListener(APP_ORDER_NOTIFY_EVENT, onNotify);
    return () => window.removeEventListener(APP_ORDER_NOTIFY_EVENT, onNotify);
  }, []);

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      !isAuthenticated ||
      !token ||
      typeof window === 'undefined'
    ) {
      return;
    }

    let cancelled = false;
    revisionRef.current = readRevision();
    readyRef.current = revisionRef.current > 0;

    const handleFeed = (feed: Awaited<ReturnType<typeof fetchOnlineOrderNotifyFeed>>) => {
      if (!readyRef.current) {
        revisionRef.current = feed.revision;
        writeRevision(feed.revision);
        readyRef.current = true;
        // Sync badge once on connect without alerting historical backlog.
        notifyAppOrderNotify({
          unreadCount: feed.unreadCount,
          revision: feed.revision,
          label: '',
        });
        return;
      }

      if (feed.revision > revisionRef.current) {
        revisionRef.current = feed.revision;
        writeRevision(feed.revision);
      }

      if (feed.events.length === 0) {
        // Timeout with no new events — badge only (no list Odoo reload).
        notifyAppOrderNotify({
          unreadCount: feed.unreadCount,
          revision: feed.revision,
          label: '',
        });
        return;
      }

      const first = feed.events[feed.events.length - 1];
      const label =
        feed.events.length === 1
          ? first?.number
            ? `New App Order ${first.number}`
            : 'New App Order received'
          : `${feed.events.length} new App Orders received`;

      if (soundEnabled && isOnlineOrderAlertSoundUnlocked()) {
        playOnlineOrderAlertSound();
      }

      setSnack(label);
      notifyAppOrderNotify(
        {
          unreadCount: feed.unreadCount,
          revision: feed.revision,
          label,
        },
        { refreshList: true },
      );
    };

    const loop = async () => {
      // Baseline snapshot (instant).
      try {
        const baseline = await fetchOnlineOrderNotifyFeed(
          token,
          revisionRef.current,
        );
        if (cancelled) return;
        handleFeed(baseline);
      } catch {
        // Continue into wait loop.
      }

      while (!cancelled) {
        if (!isTabVisible()) {
          await new Promise<void>(resolve => {
            const onVis = () => {
              if (isTabVisible()) {
                document.removeEventListener('visibilitychange', onVis);
                resolve();
              }
            };
            document.addEventListener('visibilitychange', onVis);
            // Safety: also wake after a while if event missed.
            setTimeout(() => {
              document.removeEventListener('visibilitychange', onVis);
              resolve();
            }, 30_000);
          });
          if (cancelled) return;
        }

        try {
          const feed = await waitOnlineOrderNotifyFeed(
            token,
            revisionRef.current,
            WAIT_MS,
          );
          if (cancelled) return;
          handleFeed(feed);
        } catch {
          // Brief backoff on errors, then retry (still not Odoo).
          await new Promise(r => setTimeout(r, 2_000));
        }
      }
    };

    void loop();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, soundEnabled]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Portal>
      <Snackbar
        visible={Boolean(snack)}
        onDismiss={() => setSnack('')}
        duration={6000}
        action={{
          label: 'OK',
          onPress: () => setSnack(''),
        }}>
        {snack}
      </Snackbar>
    </Portal>
  );
}
