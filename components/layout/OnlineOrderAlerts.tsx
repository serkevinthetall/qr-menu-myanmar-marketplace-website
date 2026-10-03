import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';

import { API_BASE_URL } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';
import { useVisibleInterval } from '@/hooks/use-visible-interval';
import { fetchOnlineOrderNotifyFeed } from '@/services/online-orders';
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
/** Cheap Redis-only check (not Odoo). Backup when SSE is blocked on Vercel. */
const REDIS_FEED_POLL_MS = 3_000;

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
    // ignore
  }
}

type StreamPayload = {
  revision?: number;
  id?: string;
  number?: string;
  unreadCount?: number;
};

/**
 * App Order alerts:
 * 1) Prefer SSE push (notify-stream)
 * 2) Always also poll Redis notify-feed every 3s (works on Vercel when SSE cannot)
 *
 * Neither path hits Odoo.
 */
export function OnlineOrderAlerts() {
  const { session, isAuthenticated } = useAuth();
  const [snack, setSnack] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const readyRef = useRef(false);
  const revisionRef = useRef(0);
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

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onNotify = (event: Event) => {
      const detail = (event as CustomEvent<{ label?: string }>).detail;
      if (detail?.label) setSnack(detail.label);
    };
    window.addEventListener(APP_ORDER_NOTIFY_EVENT, onNotify);
    return () => window.removeEventListener(APP_ORDER_NOTIFY_EVENT, onNotify);
  }, []);

  const emitAlert = (
    unreadCount: number,
    revision: number,
    label: string,
    refreshList: boolean,
  ) => {
    if (label) {
      if (soundEnabled && isOnlineOrderAlertSoundUnlocked()) {
        playOnlineOrderAlertSound();
      }
      setSnack(label);
    }
    notifyAppOrderNotify(
      { unreadCount, revision, label },
      { refreshList: refreshList && Boolean(label) },
    );
  };

  // --- Redis feed poll (reliable on Vercel) ---
  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || !token) return;
    revisionRef.current = readRevision();
    readyRef.current = revisionRef.current > 0;
  }, [isAuthenticated, token]);

  const pollRedisFeed = () => {
    if (!token) return;
    void (async () => {
      try {
        const feed = await fetchOnlineOrderNotifyFeed(
          token,
          revisionRef.current,
        );
        if (!readyRef.current) {
          revisionRef.current = feed.revision;
          writeRevision(feed.revision);
          readyRef.current = true;
          emitAlert(feed.unreadCount, feed.revision, '', false);
          return;
        }
        if (feed.revision > revisionRef.current) {
          revisionRef.current = feed.revision;
          writeRevision(feed.revision);
        }
        if (feed.events.length === 0) {
          emitAlert(feed.unreadCount, feed.revision, '', false);
          return;
        }
        const first = feed.events[feed.events.length - 1];
        const label =
          feed.events.length === 1
            ? first?.number
              ? `New App Order ${first.number}`
              : 'New App Order received'
            : `${feed.events.length} new App Orders received`;
        emitAlert(feed.unreadCount, feed.revision, label, true);
      } catch {
        // quiet
      }
    })();
  };

  useVisibleInterval(
    pollRedisFeed,
    REDIS_FEED_POLL_MS,
    Platform.OS === 'web' && Boolean(isAuthenticated && token),
  );

  // --- SSE push (best-effort; often blocked/buffered on Vercel) ---
  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      !isAuthenticated ||
      !token ||
      typeof window === 'undefined' ||
      typeof EventSource === 'undefined'
    ) {
      return;
    }

    let closed = false;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) return;
      const params = new URLSearchParams();
      params.set('access_token', token);
      params.set('since', String(readRevision()));
      const url = `${API_BASE_URL}/online-orders/notify-stream?${params.toString()}`;
      source = new EventSource(url, { withCredentials: true });

      source.addEventListener('ready', ev => {
        try {
          const data = JSON.parse(
            (ev as MessageEvent).data as string,
          ) as StreamPayload;
          const revision = Number(data.revision) || 0;
          writeRevision(revision);
          revisionRef.current = revision;
          readyRef.current = true;
          emitAlert(Number(data.unreadCount) || 0, revision, '', false);
        } catch {
          readyRef.current = true;
        }
      });

      source.addEventListener('app-order', ev => {
        try {
          const data = JSON.parse(
            (ev as MessageEvent).data as string,
          ) as StreamPayload;
          const revision = Number(data.revision) || 0;
          if (revision > 0) {
            writeRevision(revision);
            revisionRef.current = revision;
          }
          if (!readyRef.current) return;
          const label = data.number
            ? `New App Order ${data.number}`
            : 'New App Order received';
          emitAlert(Number(data.unreadCount) || 0, revision, label, true);
        } catch {
          // ignore
        }
      });

      source.onerror = () => {
        source?.close();
        source = null;
        if (closed) return;
        retryTimer = setTimeout(connect, 5_000);
      };
    };

    connect();
    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sound toggle shouldn't rebuild EventSource constantly
  }, [isAuthenticated, token]);

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
