import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';

import { API_BASE_URL } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';
import { useVisibleInterval } from '@/hooks/use-visible-interval';
import { fetchOnlineOrderNotifyFeed } from '@/services/online-orders';
import {
  APP_ORDER_NOTIFY_EVENT,
  ensureOnlineOrderAlertsEnabledDefault,
  notifyAppOrderNotify,
  readOnlineOrderAlertsEnabled,
} from '@/utils/online-order-alerts-preference';
import {
  ensureAlertAudioElement,
  playSoundForNotifyPopup,
  preloadOnlineOrderAlertSound,
  unlockOnlineOrderAlertSound,
} from '@/utils/online-order-alert-sound';

const REVISION_KEY = '@qr_shop_web_online_order_notify_rev';
/** Cheap Redis-only check (not Odoo). */
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
 * App Order alerts via Redis notify-feed (+ optional SSE).
 * Snackbar here; sound plays when the App Order badge count increases.
 */
export function OnlineOrderAlerts() {
  const { session, isAuthenticated } = useAuth();
  const [snack, setSnack] = useState('');
  const readyRef = useRef(false);
  const revisionRef = useRef(0);
  /** Order ids already used for snackbar/badge bump this session. */
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const token = session?.token;

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    ensureOnlineOrderAlertsEnabledDefault();
    ensureAlertAudioElement();
    preloadOnlineOrderAlertSound();
  }, []);

  // Unlock audio on any click while logged in (needed by browsers).
  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || typeof window === 'undefined') {
      return;
    }
    preloadOnlineOrderAlertSound();
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
    newEventCount = 0,
  ) => {
    if (label) {
      setSnack(label);
      // New App Order toast → sound (debounced with badge handler).
      if (readOnlineOrderAlertsEnabled()) {
        void playSoundForNotifyPopup();
      }
    }
    notifyAppOrderNotify(
      {
        unreadCount,
        revision,
        label,
        newEventCount,
      },
      { refreshList: refreshList && Boolean(label) },
    );
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || !isAuthenticated || !token) return;
    // Always re-baseline after login/reload. Never treat sessionStorage revision
    // as "ready" — that replays old Redis events as brand-new popups.
    revisionRef.current = readRevision();
    readyRef.current = false;
    seenOrderIdsRef.current = new Set();
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
          // Catch up quietly: sync badge + revision, do not snackbar history.
          for (const event of feed.events) {
            seenOrderIdsRef.current.add(String(event.id));
          }
          revisionRef.current = feed.revision;
          writeRevision(feed.revision);
          readyRef.current = true;
          emitAlert(feed.unreadCount, feed.revision, '', false, 0);
          return;
        }
        if (feed.revision > revisionRef.current) {
          revisionRef.current = feed.revision;
          writeRevision(feed.revision);
        }
        if (feed.events.length === 0) {
          emitAlert(feed.unreadCount, feed.revision, '', false, 0);
          return;
        }
        const fresh = feed.events.filter(event => {
          const key = String(event.id);
          if (seenOrderIdsRef.current.has(key)) return false;
          seenOrderIdsRef.current.add(key);
          return true;
        });
        if (fresh.length === 0) {
          emitAlert(feed.unreadCount, feed.revision, '', false, 0);
          return;
        }
        const first = fresh[fresh.length - 1];
        const label =
          fresh.length === 1
            ? first?.number
              ? `New App Order ${first.number}`
              : 'New App Order received'
            : `${fresh.length} new App Orders received`;
        emitAlert(
          feed.unreadCount,
          feed.revision,
          label,
          true,
          fresh.length,
        );
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
          // SSE ready = live tip of the stream. Do not alert backlog.
          writeRevision(revision);
          revisionRef.current = Math.max(revisionRef.current, revision);
          readyRef.current = true;
          emitAlert(Number(data.unreadCount) || 0, revision, '', false, 0);
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
            revisionRef.current = Math.max(revisionRef.current, revision);
          }
          // Wait until baseline finished so reconnect backlog is not toasted.
          if (!readyRef.current) return;
          const orderKey = data.id != null ? String(data.id) : '';
          if (orderKey && seenOrderIdsRef.current.has(orderKey)) {
            emitAlert(Number(data.unreadCount) || 0, revision, '', false, 0);
            return;
          }
          if (orderKey) seenOrderIdsRef.current.add(orderKey);
          const label = data.number
            ? `New App Order ${data.number}`
            : 'New App Order received';
          emitAlert(Number(data.unreadCount) || 0, revision, label, true, 1);
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
