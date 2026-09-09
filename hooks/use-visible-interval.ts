import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export function isDocumentVisible(): boolean {
  if (typeof document === 'undefined') {
    return true;
  }
  return document.visibilityState !== 'hidden';
}

/**
 * Run `onTick` immediately (if visible), then on an interval while the tab is
 * visible. Also ticks when the tab becomes visible again.
 */
export function useVisibleInterval(
  onTick: () => void,
  intervalMs: number,
  enabled: boolean,
): void {
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (Platform.OS === 'web' && !isDocumentVisible()) return;
      onTickRef.current();
    };

    tick();
    const timer = setInterval(tick, intervalMs);

    const onVisibility = () => {
      if (isDocumentVisible()) {
        tick();
      }
    };

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [enabled, intervalMs]);
}
