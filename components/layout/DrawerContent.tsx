import { useState } from 'react';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Badge, Drawer, Icon, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Href, useRouter } from 'expo-router';

import { NAV_ENTRIES, NavItem } from '@/constants/navigation';
import { useAppOrderUnread } from '@/contexts/app-order-unread-context';
import { useMemberRequestBadge } from '@/contexts/member-request-badge-context';
import { ENABLE_APP_INSTALL_CALL_LIST, useCallListBadge } from '@/features/app-install';

export function DrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { unreadCount } = useAppOrderUnread();
  const { requestedCount } = useMemberRequestBadge();
  const { newCount } = useCallListBadge();
  const activeRoute = props.state.routes[props.state.index]?.name;
  // Only toggled by user press — never auto-open on route change.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const navigateTo = (routeName: string) => {
    // Path-based push so new drawer screens (e.g. member-requests) resolve.
    router.push(`/${routeName}` as Href);
    if (Platform.OS === 'web') {
      props.navigation.closeDrawer();
    }
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const renderLeaf = (item: NavItem, nested = false) => {
    const badgeCount =
      item.name === 'online-orders'
        ? unreadCount
        : item.name === 'member-requests'
          ? requestedCount
          : item.name === 'call-list' && ENABLE_APP_INSTALL_CALL_LIST
            ? newCount
            : 0;
    const showBadge = badgeCount > 0;
    const row = (
      <View style={styles.leafRow}>
        <View style={styles.leafItem}>
          <Drawer.Item
            label={item.label}
            icon={item.icon}
            active={activeRoute === item.name}
            onPress={() => navigateTo(item.name)}
          />
        </View>
        {showBadge ? (
          <Badge style={styles.navBadge} size={18}>
            {badgeCount > 99 ? '99+' : badgeCount}
          </Badge>
        ) : null}
      </View>
    );

    if (!nested) {
      return <View key={item.name}>{row}</View>;
    }

    return (
      <View key={item.name} style={styles.nestedWrap}>
        {row}
      </View>
    );
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
        {NAV_ENTRIES.map(entry => {
          if (entry.type === 'item') {
            return renderLeaf(entry.item);
          }

          const childActive = entry.children.some(
            child => child.name === activeRoute,
          );
          const expanded = Boolean(openGroups[entry.id]);
          const showGroupBadge =
            (entry.id === 'orders' && unreadCount > 0 && !expanded) ||
            (entry.id === 'membership' && requestedCount > 0 && !expanded);
          const groupBadgeCount =
            entry.id === 'orders'
              ? unreadCount
              : entry.id === 'membership'
                ? requestedCount
                : 0;

          return (
            <View key={entry.id}>
              <Pressable
                onPress={() => toggleGroup(entry.id)}
                style={({ pressed, hovered }) => [
                  styles.groupRow,
                  {
                    backgroundColor:
                      childActive && !expanded
                        ? theme.colors.secondaryContainer
                        : hovered || pressed
                          ? theme.colors.surfaceVariant
                          : 'transparent',
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${entry.label} menu`}>
                <Icon
                  source={entry.icon}
                  size={24}
                  color={
                    childActive
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
                <Text
                  variant="labelLarge"
                  style={[
                    styles.groupLabel,
                    {
                      color: childActive
                        ? theme.colors.primary
                        : theme.colors.onSurface,
                      fontWeight: childActive ? '700' : '500',
                    },
                  ]}>
                  {entry.label}
                </Text>
                {showGroupBadge ? (
                  <Badge style={styles.groupBadge} size={18}>
                    {groupBadgeCount > 99 ? '99+' : groupBadgeCount}
                  </Badge>
                ) : null}
                <Icon
                  source={expanded ? 'chevron-up' : 'chevron-down'}
                  size={22}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>

              {expanded
                ? entry.children.map(child => renderLeaf(child, true))
                : null}
            </View>
          );
        })}
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
    width: 200,
    height: 200,
  },
  tagline: {
    marginTop: 8,
    letterSpacing: 1,
    opacity: 0.75,
  },
  section: {
    marginTop: 8,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 12,
    marginVertical: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 28,
  },
  groupLabel: {
    flex: 1,
  },
  nestedWrap: {
    paddingLeft: 28,
  },
  leafRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  leafItem: {
    flexGrow: 1,
  },
  navBadge: {
    position: 'absolute',
    right: 20,
    top: 14,
  },
  groupBadge: {
    marginRight: 4,
  },
});
