import { Drawer } from 'expo-router/drawer';
import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useTheme } from 'react-native-paper';

import { AppHeader } from '@/components/layout/AppHeader';
import { DrawerContent } from '@/components/layout/DrawerContent';
import { OnlineOrderAlerts } from '@/components/layout/OnlineOrderAlerts';
import { AppColors } from '@/constants/colors';
import { NAV_ITEMS } from '@/constants/navigation';
import { AppOrderUnreadProvider } from '@/contexts/app-order-unread-context';
import { SearchProvider } from '@/contexts/search-context';
import { useAppTheme } from '@/contexts/theme-context';
import {
  CallListBadgeProvider,
  ENABLE_APP_INSTALL_CALL_LIST,
} from '@/features/app-install';
import { useResponsive } from '@/hooks/use-responsive';

export const unstable_settings = {
  initialRouteName: 'overview',
};

export default function DrawerLayout() {
  const { sidebarWidth } = useResponsive();
  const { mode } = useAppTheme();
  const theme = useTheme();
  const colors = AppColors[mode];
  const isWeb = Platform.OS === 'web';

  // Keep a stable header renderer (avoids remounts) while still rendering
  // inside Paper/Search providers — `header: AppHeader` breaks useTheme on web.
  const renderHeader = useCallback(
    (props: React.ComponentProps<typeof AppHeader>) => <AppHeader {...props} />,
    [],
  );

  const screenOptions = useMemo(
    () => ({
      header: renderHeader,
      drawerType: isWeb ? ('slide' as const) : ('front' as const),
      drawerStyle: {
        width: sidebarWidth,
        backgroundColor: theme.colors.surface,
        borderRightWidth: isWeb ? 1 : 0,
        borderRightColor: theme.colors.outline,
      },
      sceneContainerStyle: {
        backgroundColor: theme.colors.background,
      },
      swipeEnabled: !isWeb,
      overlayColor: isWeb ? 'transparent' : colors.drawerOverlay,
      drawerStatusBarAnimation: 'slide' as const,
    }),
    [colors.drawerOverlay, isWeb, renderHeader, sidebarWidth, theme.colors],
  );

  const drawerTree = (
    <>
      <OnlineOrderAlerts />
      <Drawer
        drawerContent={props => <DrawerContent {...props} />}
        screenOptions={screenOptions}>
        {NAV_ITEMS.map(item => (
          <Drawer.Screen
            key={item.name}
            name={item.name}
            options={{ title: item.title, drawerLabel: item.label }}
          />
        ))}
        <Drawer.Screen
          name="contact-create"
          options={{
            title: 'New Contact',
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    </>
  );

  return (
    <SearchProvider>
      <AppOrderUnreadProvider>
        {/* @temp-feature app-install-call-list */}
        {ENABLE_APP_INSTALL_CALL_LIST ? (
          <CallListBadgeProvider>{drawerTree}</CallListBadgeProvider>
        ) : (
          drawerTree
        )}
      </AppOrderUnreadProvider>
    </SearchProvider>
  );
}
