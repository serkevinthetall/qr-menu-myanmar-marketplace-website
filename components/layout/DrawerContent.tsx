import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { Image } from 'expo-image';
import { Platform, StyleSheet, View } from 'react-native';
import { Drawer, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV_ITEMS } from '@/constants/navigation';
import { useAuth } from '@/contexts/auth-context';

export function DrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const activeRoute = props.state.routes[props.state.index]?.name;

  const navigateTo = (routeName: string) => {
    props.navigation.navigate(routeName);
    if (Platform.OS === 'web') {
      props.navigation.closeDrawer();
    }
  };

  const handleLogout = async () => {
    props.navigation.closeDrawer();
    await logout();
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.scrollContent,
        {
          backgroundColor: theme.colors.surface,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}>
      <View
        style={[
          styles.brand,
          { borderBottomColor: theme.colors.outline },
        ]}>
        <Image
          source={require('@/assets/images/qr-shop-logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
        <Text
          variant="labelMedium"
          style={[styles.tagline, { color: theme.colors.onSurfaceVariant }]}>
          SCAN. SHOP. SAVE.
        </Text>
      </View>

      <Drawer.Section title="Modules" style={styles.section}>
        {NAV_ITEMS.map(item => (
          <Drawer.Item
            key={item.name}
            label={item.label}
            icon={item.icon}
            active={activeRoute === item.name}
            onPress={() => navigateTo(item.name)}
          />
        ))}
      </Drawer.Section>

      <Drawer.Section
        title="Account"
        style={[styles.accountSection, { borderTopColor: theme.colors.outline }]}>
        {user ? (
          <View style={styles.userInfo}>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface }}>
              {user.name}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}>
              {user.email}
            </Text>
          </View>
        ) : null}
        <Drawer.Item label="Logout" icon="logout" onPress={handleLogout} />
      </Drawer.Section>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  brand: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  logo: {
    width: 180,
    height: 120,
  },
  tagline: {
    marginTop: 4,
    letterSpacing: 1,
    opacity: 0.75,
  },
  section: {
    marginTop: 8,
  },
  accountSection: {
    borderTopWidth: 1,
    marginTop: 8,
  },
  userInfo: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 2,
  },
});
