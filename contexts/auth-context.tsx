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
import { authenticateAppUser, logoutAppUser } from '@/services/app/auth';
import { clearAppProductCatalog } from '@/services/app/product-catalog-cache';
import { authenticateUser, isSessionValid, logoutUser } from '@/services/auth';
import { clearWebProductCatalog } from '@/services/web/product-catalog-cache';
import { AuthSession, AuthUser, LoginCredentials } from '@/types/auth';

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

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then(stored => {
        if (!stored) {
          return;
        }

        const parsed = JSON.parse(stored) as AuthSession;
        if (isSessionValid(parsed)) {
          setSession(parsed);
        } else {
          AsyncStorage.removeItem(storageKey);
        }
      })
      .finally(() => setIsLoading(false));
  }, [storageKey]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const nextSession = isSalesRepAppSurface()
      ? await authenticateAppUser(credentials)
      : await authenticateUser(credentials);
    setSession(nextSession);
    await AsyncStorage.setItem(storageKey, JSON.stringify(nextSession));
  }, [storageKey]);

  const logout = useCallback(async () => {
    if (session?.token) {
      try {
        if (isSalesRepAppSurface()) {
          await logoutAppUser(session.token);
        } else {
          await logoutUser(session.token);
        }
      } catch {
        // Clear local session even if backend logout fails.
      }
    }

    setSession(null);
    if (isSalesRepAppSurface()) {
      clearAppProductCatalog();
    } else {
      clearWebProductCatalog();
    }
    await AsyncStorage.removeItem(storageKey);
  }, [session?.token, storageKey]);

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
