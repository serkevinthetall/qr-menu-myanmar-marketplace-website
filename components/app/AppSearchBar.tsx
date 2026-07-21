import { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

type AppSearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  /** Optional trailing controls (e.g. list/grid). Rendered after clear. */
  right?: ReactNode;
  style?: ViewStyle;
};

/**
 * Search field without Paper Searchbar's empty clear IconButton
 * (that shows as a solid black circle on dark theme).
 */
export function AppSearchBar({
  value,
  onChangeText,
  placeholder,
  right,
  style,
}: AppSearchBarProps) {
  const theme = useTheme();
  const muted = theme.colors.onSurfaceVariant;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.elevation.level3,
          borderRadius: theme.roundness * 7,
          borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
          shadowColor: '#000',
        },
        style,
      ]}>
      <Icon source="magnify" size={22} color={muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={muted}
        style={[styles.input, { color: theme.colors.onSurface }]}
        returnKeyType="search"
        underlineColorAndroid="transparent"
        accessibilityRole="search"
        autoCorrect={false}
        autoCapitalize="none"
        clearButtonMode="never"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText('')}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.iconHit}>
          <Icon source="close" size={20} color={muted} />
        </Pressable>
      ) : null}
      {right}
    </View>
  );
}

type ViewToggleProps = {
  mode: 'list' | 'grid';
  onChange: (mode: 'list' | 'grid') => void;
};

export function AppSearchViewToggle({ mode, onChange }: ViewToggleProps) {
  const theme = useTheme();
  const muted = theme.colors.onSurfaceVariant;

  return (
    <View style={styles.toggleRow}>
      <Pressable
        onPress={() => onChange('list')}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="List view"
        style={styles.iconHit}>
        <Icon
          source="view-list"
          size={22}
          color={mode === 'list' ? theme.colors.primary : muted}
        />
      </Pressable>
      <Pressable
        onPress={() => onChange('grid')}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Grid view"
        style={styles.iconHit}>
        <Icon
          source="view-grid"
          size={22}
          color={mode === 'grid' ? theme.colors.primary : muted}
        />
      </Pressable>
    </View>
  );
}

/** Height reserved so list content clears the floating search bar. */
export const APP_FLOATING_SEARCH_INSET = 76;

/** Extra height when category chips sit under the floating search. */
export const APP_FLOATING_SEARCH_WITH_CHIPS_INSET = 128;

type FloatingHeaderProps = {
  children: ReactNode;
  /** Optional row under search (e.g. category chips). */
  footer?: ReactNode;
  style?: ViewStyle;
};

/**
 * Absolutely positioned floating search (and optional chips) so the list
 * scrolls underneath.
 */
export function AppFloatingSearchHeader({
  children,
  footer,
  style,
}: FloatingHeaderProps) {
  return (
    <View pointerEvents="box-none" style={[styles.floatHost, style]}>
      <View style={styles.floatSearchPad}>{children}</View>
      {footer ? <View style={styles.floatFooter}>{footer}</View> : null}
    </View>
  );
}

/** @deprecated Use AppFloatingSearchHeader — kept for old call sites. */
export const appSearchWrapStyle = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 14,
  },
}).wrap;

const styles = StyleSheet.create({
  floatHost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 12,
  },
  floatSearchPad: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  floatFooter: {
    paddingBottom: 4,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    minHeight: 52,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 0,
    backgroundColor: 'transparent',
  },
  iconHit: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
