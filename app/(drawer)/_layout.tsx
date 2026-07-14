import { Drawer } from 'expo-router/drawer';
import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useTheme } from 'react-native-paper';

import { AppHeader } from '@/components/layout/AppHeader';
import { DrawerContent } from '@/components/layout/DrawerContent';
import { AppColors } from '@/constants/colors';
import { NAV_ITEMS } from '@/constants/navigation';
import { SearchProvider } from '@/contexts/search-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useResponsive } from '@/hooks/use-responsive';

export default function DrawerLayout() {
  const { sidebarWidth } = useResponsive();
  const { width } = useWindowDimensions();
  const { mode } = useAppTheme();
  const theme = useTheme();
  const colors = AppColors[mode];
  const isWeb = Platform.OS === 'web';

  const screenOptions = useMemo(
    () => ({
      header: (props: Parameters<typeof AppHeader>[0]) => <AppHeader {...props} />,
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
    [colors.drawerOverlay, isWeb, sidebarWidth, theme.colors, width],
  );

  return (
    <SearchProvider>
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
    </SearchProvider>
  );
}
