import { useState } from 'react';
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
} from '@react-navigation/drawer';
import { Image } from 'expo-image';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Drawer, Icon, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV_ENTRIES, NavItem } from '@/constants/navigation';

export function DrawerContent(props: DrawerContentComponentProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const activeRoute = props.state.routes[props.state.index]?.name;
  // Only toggled by user press — never auto-open on route change.
  const [ordersOpen, setOrdersOpen] = useState(false);

  const navigateTo = (routeName: string) => {
    props.navigation.navigate(routeName);
    if (Platform.OS === 'web') {
      props.navigation.closeDrawer();
    }
  };

  const renderLeaf = (item: NavItem, nested = false) => {
    const row = (
      <Drawer.Item
        label={item.label}
        icon={item.icon}
        active={activeRoute === item.name}
        onPress={() => navigateTo(item.name)}
      />
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
          const expanded = entry.id === 'orders' ? ordersOpen : false;

          return (
            <View key={entry.id}>
              <Pressable
                onPress={() => {
                  if (entry.id === 'orders') {
                    setOrdersOpen(prev => !prev);
                  }
                }}
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
});
