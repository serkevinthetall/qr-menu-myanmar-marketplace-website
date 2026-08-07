import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const PREFIX = '@qr_shop_list_ui_v1_';

/**
 * Persist list UI (filters, view mode, checkbox selection) in browser cache.
 * Web only — native screens keep in-memory defaults.
 */
export async function readListUiCache<T extends object>(
  moduleKey: string,
): Promise<Partial<T> | null> {
  if (Platform.OS !== 'web') {
    return null;
  }
  try {
    const raw = await AsyncStorage.getItem(PREFIX + moduleKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Partial<T>;
  } catch {
    return null;
  }
}

export async function writeListUiCache<T extends object>(
  moduleKey: string,
  value: T,
): Promise<void> {
  if (Platform.OS !== 'web') {
    return;
  }
  try {
    await AsyncStorage.setItem(PREFIX + moduleKey, JSON.stringify(value));
  } catch {
    // Ignore private mode / quota failures.
  }
}

/**
 * Hydrates `defaults` from AsyncStorage once, then writes the latest snapshot
 * whenever `snapshot` changes (after hydrate).
 */
export function useListUiCache<T extends object>(
  moduleKey: string,
  snapshot: T,
  apply: (saved: Partial<T>) => void,
): boolean {
  const [ready, setReady] = useState(Platform.OS !== 'web');
  const applyRef = useRef(apply);
  applyRef.current = apply;
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      return;
    }
    let cancelled = false;
    void readListUiCache<T>(moduleKey).then(saved => {
      if (cancelled) return;
      if (saved) {
        applyRef.current(saved);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [moduleKey]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !ready) {
      return;
    }
    const timer = setTimeout(() => {
      void writeListUiCache(moduleKey, snapshotRef.current);
    }, 150);
    return () => clearTimeout(timer);
  }, [moduleKey, ready, snapshot]);

  return ready;
}

export function asIdSet(ids: unknown): Set<string> {
  if (!Array.isArray(ids)) {
    return new Set();
  }
  return new Set(
    ids
      .map(id => String(id).trim())
      .filter(Boolean)
      .slice(0, 500),
  );
}
