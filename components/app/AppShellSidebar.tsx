import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/contexts/theme-context';

const NAV = [
  { name: 'contacts/index', label: 'Contacts', icon: 'account-outline' as const },
  { name: 'quotations', label: 'Quotes', icon: 'receipt' as const },
  { name: 'products/index', label: 'Catalog', icon: 'tag-outline' as const },
] as const;

/**
 * Handheld field-sales menu — compact, POS-oriented.
 * Inspired by the ERP drawer, but not a copy (different labels, density, layout).
 */
export function AppShellSidebar(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useAppTheme();
  const activeRoute = props.state.routes[props.state.index]?.name;

  const go = (routeName: string) => {
    props.navigation.navigate(routeName);
    props.navigation.closeDrawer();
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.surface,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 12,
        },
      ]}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={styles.scroll}
        style={{ backgroundColor: 'transparent' }}>
        <View style={styles.brandRow}>
          <Image
            source={require('@/assets/images/qr-shop-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <View style={styles.brandText}>
            <Text style={styles.brandTitle}>QR Shop</Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
              Field sales
            </Text>
          </View>
        </View>

        <Text
          style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>
          MENU
        </Text>

        {NAV.map(item => {
          const active = activeRoute === item.name;
          return (
            <Pressable
              key={item.name}
              onPress={() => go(item.name)}
              style={[
                styles.navRow,
                active && {
                  backgroundColor: theme.colors.primaryContainer,
                },
              ]}>
              <View
                style={[
                  styles.navAccent,
                  {
                    backgroundColor: active
                      ? theme.colors.primary
                      : 'transparent',
                  },
                ]}
              />
              <Icon
                source={item.icon}
                size={22}
                color={
                  active ? theme.colors.primary : theme.colors.onSurfaceVariant
                }
              />
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: active
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurface,
                    fontWeight: active ? '700' : '500',
                  },
                ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </DrawerContentScrollView>

      <View style={[styles.footer, { borderTopColor: theme.colors.outline }]}>
        <Pressable onPress={toggleMode} style={styles.footerRow}>
          <Icon
            source={mode === 'dark' ? 'weather-night' : 'white-balance-sunny'}
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
          <Text style={{ flex: 1, color: theme.colors.onSurface }}>
            {mode === 'dark' ? 'Night' : 'Light'} theme
          </Text>
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
            Switch
          </Text>
        </Pressable>

        {user ? (
          <View style={styles.userBlock}>
            <Text style={{ fontWeight: '700', color: theme.colors.onSurface }}>
              {user.name}
            </Text>
            <Text
              numberOfLines={1}
              style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
              {user.email}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            props.navigation.closeDrawer();
            void logout();
          }}
          style={styles.footerRow}>
          <Icon source="logout" size={20} color={theme.colors.error} />
          <Text style={{ color: theme.colors.error, fontWeight: '600' }}>
            Logout
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingBottom: 16 },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  logo: { width: 44, height: 44 },
  brandText: { flex: 1 },
  brandTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.2 },
  sectionLabel: {
    marginTop: 8,
    marginBottom: 6,
    marginHorizontal: 16,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 10,
    marginBottom: 4,
    paddingVertical: 12,
    paddingRight: 12,
    borderRadius: 10,
    overflow: 'hidden',
  },
  navAccent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  navLabel: { fontSize: 15 },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  userBlock: { paddingVertical: 6, gap: 2 },
});
