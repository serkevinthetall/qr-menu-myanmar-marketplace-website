import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';

import { API_BASE_URL } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';
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
  customer?: string;
  total?: number;
  at?: string;
  unreadCount?: number;
  active?: boolean;
  message?: string;
};

/**
 * Push listener (SSE): Odoo webhook → Redis unread + publish → popup here.
 * No client long-poll loop.
 */
export function OnlineOrderAlerts() {
  const { session, isAuthenticated } = useAuth();
  const [snack, setSnack] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
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
      typeof window === 'undefined' ||
      typeof EventSource === 'undefined'
    ) {
      return;
    }

    let closed = false;
    let source: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    readyRef.current = false;

    const connect = () => {
      if (closed) return;
      const since = readRevision();
      const params = new URLSearchParams();
      params.set('access_token', token);
      params.set('since', String(since));
      const url = `${API_BASE_URL}/online-orders/notify-stream?${params.toString()}`;
      source = new EventSource(url, { withCredentials: true });

      source.addEventListener('ready', ev => {
        try {
          const data = JSON.parse(
            (ev as MessageEvent).data as string,
          ) as StreamPayload;
          const revision = Number(data.revision) || 0;
          writeRevision(revision);
          readyRef.current = true;
          notifyAppOrderNotify({
            unreadCount: Number(data.unreadCount) || 0,
            revision,
            label: '',
          });
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
          if (revision > 0) writeRevision(revision);

          // Skip alerts until baseline ready event finished.
          if (!readyRef.current) return;

          const label = data.number
            ? `New App Order ${data.number}`
            : 'New App Order received';

          if (soundEnabled && isOnlineOrderAlertSoundUnlocked()) {
            playOnlineOrderAlertSound();
          }
          setSnack(label);
          notifyAppOrderNotify(
            {
              unreadCount: Number(data.unreadCount) || 0,
              revision,
              label,
            },
            { refreshList: true },
          );
        } catch {
          // ignore bad frames
        }
      });

      source.addEventListener('heartbeat', ev => {
        try {
          const data = JSON.parse(
            (ev as MessageEvent).data as string,
          ) as StreamPayload;
          notifyAppOrderNotify({
            unreadCount: Number(data.unreadCount) || 0,
            revision: Number(data.revision) || readRevision(),
            label: '',
          });
        } catch {
          // ignore
        }
      });

      source.onerror = () => {
        source?.close();
        source = null;
        if (closed) return;
        // Reconnect after brief pause (SSE push resume).
        retryTimer = setTimeout(connect, 2_000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      source?.close();
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
