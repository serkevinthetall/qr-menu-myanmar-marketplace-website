import { Drawer } from 'expo-router/drawer';
import { useEffect, useMemo } from 'react';
import { useTheme } from 'react-native-paper';

import { AppMenuButton } from '@/components/app/AppMenuButton';
import { AppShellSidebar } from '@/components/app/AppShellSidebar';
import { AppColors } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/contexts/theme-context';
import { ensureAppProductCatalog } from '@/services/app/product-catalog-cache';

export default function SalesRepAppLayout() {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const { session } = useAuth();
  const colors = AppColors[mode];

  // Warm the product catalog in the background after login so Catalog /
  // create-quote search can filter locally without reloading.
  useEffect(() => {
    if (!session?.token) return;
    void ensureAppProductCatalog(session.token).catch(() => undefined);
  }, [session?.token]);

  const screenOptions = useMemo(
    () => ({
      headerStyle: { backgroundColor: theme.colors.primary },
      headerTintColor: theme.colors.onPrimary,
      headerTitleStyle: {
        fontWeight: '700' as const,
        color: theme.colors.onPrimary,
      },
      headerLeft: () => <AppMenuButton />,
      drawerType: 'front' as const,
      drawerStyle: {
        width: 280,
        backgroundColor: theme.colors.surface,
      },
      sceneContainerStyle: {
        backgroundColor: theme.colors.background,
      },
      overlayColor: colors.drawerOverlay,
      swipeEnabled: true,
    }),
    [colors.drawerOverlay, theme.colors],
  );

  return (
    <Drawer
      drawerContent={props => <AppShellSidebar {...props} />}
      screenOptions={screenOptions}>
      <Drawer.Screen
        name="contacts/index"
        options={{ title: 'Contacts', drawerLabel: 'Contacts' }}
      />
      <Drawer.Screen
        name="quotations"
        options={{
          title: 'Quotes',
          drawerLabel: 'Quotes',
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="products/index"
        options={{ title: 'Catalog', drawerLabel: 'Catalog' }}
      />
    </Drawer>
  );
}
