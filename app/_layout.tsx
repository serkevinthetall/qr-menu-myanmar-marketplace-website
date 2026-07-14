import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ActivityIndicator, PaperProvider } from 'react-native-paper';
import { View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { AppThemeProvider, useAppTheme } from '@/contexts/theme-context';

export const unstable_settings = {
  anchor: '(drawer)',
};

function ThemeLoading() {
  const { paperTheme } = useAppTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: paperTheme.colors.background,
      }}>
      <ActivityIndicator />
    </View>
  );
}

function AuthGate({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    const onLoginScreen = segments[0] === 'login';

    if (!isAuthenticated && !onLoginScreen) {
      router.replace('/login');
      return;
    }

    if (isAuthenticated && onLoginScreen) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router, segments]);

  if (isLoading) {
    return <ThemeLoading />;
  }

  return <>{children}</>;
}

function RootLayoutNav() {
  const { paperTheme, isDark, isReady } = useAppTheme();

  if (!isReady) {
    return <ThemeLoading />;
  }

  return (
    <PaperProvider
      theme={paperTheme}
      settings={{
        icon: props => <MaterialCommunityIcons {...props} />,
      }}>
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(drawer)" />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', headerShown: true, title: 'Modal' }}
          />
        </Stack>
      </AuthGate>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}
