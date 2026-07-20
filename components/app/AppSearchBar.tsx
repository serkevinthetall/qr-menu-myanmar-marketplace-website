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
 * App search field without Paper Searchbar's empty clear IconButton
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

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
    minHeight: 52,
    gap: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    minWidth: 0,
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
