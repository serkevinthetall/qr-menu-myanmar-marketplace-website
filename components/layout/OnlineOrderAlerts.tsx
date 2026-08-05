import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';

import { useAuth } from '@/contexts/auth-context';
import { fetchOnlineOrders } from '@/services/online-orders';
import {
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
    // Keep the newest ids only so storage stays small.
    const list = [...ids].slice(-500);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Ignore quota / private mode failures.
  }
}

/**
 * Website ERP only: poll Online Orders and chime when a new one appears.
 * First poll establishes baseline (no sound). Quotation / Sale Order ignored.
 */
export function OnlineOrderAlerts() {
  const { session, isAuthenticated } = useAuth();
  const [snack, setSnack] = useState('');
  const seenRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);

  // Unlock audio after first user gesture (browser autoplay policy).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    const unlock = () => {
      void unlockOnlineOrderAlertSound();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

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
          playOnlineOrderAlertSound();
          const label =
            newcomers.length === 1
              ? 'New Online Order received'
              : `${newcomers.length} new Online Orders received`;
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
  }, [isAuthenticated, session?.token]);

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
