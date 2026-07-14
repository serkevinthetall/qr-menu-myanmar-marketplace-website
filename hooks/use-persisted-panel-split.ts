import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const STORAGE_PREFIX = '@qr_shop_panel_split';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

type UsePersistedPanelSplitOptions = {
  storageKey: string;
  defaultRatio: number;
  minRatio: number;
  maxRatio: number;
  containerSize: number;
};

export function usePersistedPanelSplit({
  storageKey,
  defaultRatio,
  minRatio,
  maxRatio,
  containerSize,
}: UsePersistedPanelSplitOptions) {
  const [primaryRatio, setPrimaryRatio] = useState(defaultRatio);
  const loadedRef = useRef(false);
  const containerSizeRef = useRef(containerSize);
  const fullKey = `${STORAGE_PREFIX}_${storageKey}`;

  containerSizeRef.current = containerSize;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      loadedRef.current = true;
      return;
    }

    AsyncStorage.getItem(fullKey)
      .then(stored => {
        if (!stored) {
          return;
        }
        const parsed = Number(stored);
        if (Number.isFinite(parsed)) {
          setPrimaryRatio(clamp(parsed, minRatio, maxRatio));
        }
      })
      .finally(() => {
        loadedRef.current = true;
      });
  }, [fullKey, minRatio, maxRatio]);

  const persistRatio = useCallback(
    (ratio: number) => {
      if (Platform.OS !== 'web') {
        return;
      }
      void AsyncStorage.setItem(fullKey, String(ratio));
    },
    [fullKey],
  );

  const applyDragDelta = useCallback(
    (delta: number) => {
      setPrimaryRatio(current => {
        const size = containerSizeRef.current;
        if (size <= 0) {
          return current;
        }

        return clamp(current + delta / size, minRatio, maxRatio);
      });
    },
    [minRatio, maxRatio],
  );

  const handleDragEnd = useCallback(() => {
    setPrimaryRatio(current => {
      persistRatio(current);
      return current;
    });
  }, [persistRatio]);

  const resetRatio = useCallback(() => {
    setPrimaryRatio(defaultRatio);
    persistRatio(defaultRatio);
  }, [defaultRatio, persistRatio]);

  return {
    primaryRatio,
    applyDragDelta,
    handleDragEnd,
    resetRatio,
    secondaryRatio: 1 - primaryRatio,
  };
}
