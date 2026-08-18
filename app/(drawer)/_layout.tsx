import { DrawerHeaderProps } from '@react-navigation/drawer';
import { Drawer } from 'expo-router/drawer';
import { useMemo } from 'react';
import { Platform } from 'react-native';
import { useTheme } from 'react-native-paper';

import { AppHeader } from '@/components/layout/AppHeader';
import { DrawerContent } from '@/components/layout/DrawerContent';
import { MemberRequestAlerts } from '@/components/layout/MemberRequestAlerts';
import { OnlineOrderAlerts } from '@/components/layout/OnlineOrderAlerts';
import { AppColors } from '@/constants/colors';
import { NAV_ITEMS } from '@/constants/navigation';
import { AppOrderUnreadProvider } from '@/contexts/app-order-unread-context';
import { MemberRequestBadgeProvider } from '@/contexts/member-request-badge-context';
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

/**
 * React Navigation Drawer calls `options.header(props)` as a plain function
 * inside `routes.map`. Passing `AppHeader` there runs its hooks in DrawerView
 * and throws React #310 when another lazy screen mounts.
 * This wrapper must only return an element — no hooks.
 */
function renderDrawerHeader(props: DrawerHeaderProps) {
  'use no memo';
  return <AppHeader {...props} />;
}

export default function DrawerLayout() {
  'use no memo';
  const { sidebarWidth } = useResponsive();
  const { mode } = useAppTheme();
  const theme = useTheme();
  const colors = AppColors[mode];
  const isWeb = Platform.OS === 'web';

  const screenOptions = useMemo(
    () => ({
      header: renderDrawerHeader,
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
    [colors.drawerOverlay, isWeb, sidebarWidth, theme.colors],
  );

  const drawerTree = (
    <>
      <OnlineOrderAlerts />
      <MemberRequestAlerts />
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
        <Drawer.Screen
          name="overview-detail"
          options={{
            title: 'Overview detail',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="overview-sales"
          options={{
            title: 'Sale orders',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="overview-purchases"
          options={{
            title: 'Purchase orders',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="overview-demand"
          options={{
            title: 'Highest demand',
            drawerItemStyle: { display: 'none' },
          }}
        />
        <Drawer.Screen
          name="app-user-list"
          options={{
            title: 'App user list',
            drawerItemStyle: { display: 'none' },
          }}
        />
      </Drawer>
    </>
  );

  return (
    <SearchProvider>
      <AppOrderUnreadProvider>
        <MemberRequestBadgeProvider>
          {/* @temp-feature app-install-call-list */}
          {ENABLE_APP_INSTALL_CALL_LIST ? (
            <CallListBadgeProvider>{drawerTree}</CallListBadgeProvider>
          ) : (
            drawerTree
          )}
        </MemberRequestBadgeProvider>
      </AppOrderUnreadProvider>
    </SearchProvider>
  );
}
