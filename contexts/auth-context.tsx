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

import { authenticateUser, isSessionValid, logoutUser } from '@/services/auth';
import { AuthSession, AuthUser, LoginCredentials } from '@/types/auth';

const SESSION_STORAGE_KEY = '@qr_shop_session';

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

  useEffect(() => {
    AsyncStorage.getItem(SESSION_STORAGE_KEY)
      .then(stored => {
        if (!stored) {
          return;
        }

        const parsed = JSON.parse(stored) as AuthSession;
        if (isSessionValid(parsed)) {
          setSession(parsed);
        } else {
          AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const nextSession = await authenticateUser(credentials);
    setSession(nextSession);
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
  }, []);

  const logout = useCallback(async () => {
    if (session?.token) {
      try {
        await logoutUser(session.token);
      } catch {
        // Clear local session even if backend logout fails.
      }
    }

    setSession(null);
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  }, [session?.token]);

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
