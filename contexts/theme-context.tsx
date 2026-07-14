import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { MD3Theme } from 'react-native-paper';

import { ThemeMode } from '@/constants/colors';
import { qrShopDarkTheme, qrShopLightTheme } from '@/constants/paper-theme';

const THEME_STORAGE_KEY = '@qr_shop_theme_mode';

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  paperTheme: MD3Theme;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  isReady: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(
    systemScheme === 'dark' ? 'dark' : 'light',
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(stored => {
        if (stored === 'light' || stored === 'dark') {
          setModeState(stored);
        }
      })
      .finally(() => setIsReady(true));
  }, []);

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark: mode === 'dark',
      paperTheme: mode === 'dark' ? qrShopDarkTheme : qrShopLightTheme,
      setMode,
      toggleMode,
      isReady,
    }),
    [mode, setMode, toggleMode, isReady],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
}
