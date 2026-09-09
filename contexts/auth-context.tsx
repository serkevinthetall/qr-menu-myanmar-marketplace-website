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

import { isSalesRepAppSurface, sessionStorageKeyForSurface } from '@/constants/app-surface';
import { WEB_COOKIE_AUTH_TOKEN } from '@/constants/auth-token';
import { authenticateAppUser, logoutAppUser } from '@/services/app/auth';
import { clearAppProductCatalog } from '@/services/app/product-catalog-cache';
import {
  authenticateUser,
  fetchCurrentUser,
  isSessionValid,
  logoutUser,
} from '@/services/auth';
import { clearWebProductCatalog } from '@/services/web/product-catalog-cache';
import { AuthSession, AuthUser, LoginCredentials } from '@/types/auth';
import { subscribeSessionExpired } from '@/utils/session-expiry';

type AuthContextValue = {
  session: AuthSession | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const storageKey = sessionStorageKeyForSurface();
  const isApp = isSalesRepAppSurface();

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const storedRaw = await AsyncStorage.getItem(storageKey);
        const stored = storedRaw
          ? (JSON.parse(storedRaw) as AuthSession)
          : null;

        if (isApp) {
          if (stored && isSessionValid(stored) && stored.token !== WEB_COOKIE_AUTH_TOKEN) {
            if (!cancelled) setSession(stored);
          } else if (stored) {
            await AsyncStorage.removeItem(storageKey);
          }
          return;
        }

        // Web: httpOnly cookie only — drop any old JWT left in AsyncStorage.
        if (stored?.token && stored.token !== WEB_COOKIE_AUTH_TOKEN) {
          await AsyncStorage.removeItem(storageKey);
        }

        const fromCookie = await fetchCurrentUser(null);
        if (!cancelled && fromCookie && isSessionValid(fromCookie)) {
          setSession(fromCookie);
          await AsyncStorage.setItem(
            storageKey,
            JSON.stringify({
              ...fromCookie,
              token: WEB_COOKIE_AUTH_TOKEN,
            }),
          );
        } else {
          await AsyncStorage.removeItem(storageKey);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [storageKey, isApp]);

  const clearLocalSession = useCallback(async () => {
    setSession(null);
    if (isApp) {
      clearAppProductCatalog();
    } else {
      clearWebProductCatalog();
    }
    await AsyncStorage.removeItem(storageKey);
  }, [storageKey, isApp]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const nextSession = isApp
        ? await authenticateAppUser(credentials)
        : await authenticateUser(credentials);
      const toStore = isApp
        ? nextSession
        : { ...nextSession, token: WEB_COOKIE_AUTH_TOKEN };
      setSession(toStore);
      await AsyncStorage.setItem(storageKey, JSON.stringify(toStore));
    },
    [storageKey, isApp],
  );

  const logout = useCallback(async () => {
    try {
      if (isApp) {
        if (session?.token && session.token !== WEB_COOKIE_AUTH_TOKEN) {
          await logoutAppUser(session.token);
        }
      } else {
        await logoutUser(session?.token);
      }
    } catch {
      // Clear local session even if backend logout fails.
    }

    await clearLocalSession();
  }, [session?.token, clearLocalSession, isApp]);

  useEffect(() => {
    return subscribeSessionExpired(() => {
      void clearLocalSession();
    });
  }, [clearLocalSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: isSessionValid(session),
      isLoading,
      login,
      logout,
    }),
    [session, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
