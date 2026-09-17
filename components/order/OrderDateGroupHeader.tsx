import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

function formatGroupMoney(value: number): string {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type Props = {
  label: string;
  count: number;
  total: number;
  collapsed: boolean;
  depth: 0 | 1;
  onToggle: () => void;
  style?: ViewStyle;
};

/** Odoo-style Month / Day group row with count + total. */
export function OrderDateGroupHeader({
  label,
  count,
  total,
  collapsed,
  depth,
  onToggle,
  style,
}: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onToggle}
      style={({ hovered }) => [
        styles.groupHeader,
        {
          backgroundColor: hovered
            ? theme.colors.primaryContainer
            : depth === 0
              ? theme.colors.surfaceVariant
              : theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
          paddingLeft: depth === 0 ? 10 : 28,
        },
        style,
      ]}>
      <Icon
        source={collapsed ? 'chevron-right' : 'chevron-down'}
        size={20}
        color={theme.colors.onSurfaceVariant}
      />
      <Text
        style={[
          styles.groupHeaderLabel,
          depth === 0 ? styles.groupHeaderLabelMonth : null,
          { color: theme.colors.onSurface },
        ]}
        numberOfLines={1}>
        {label}
      </Text>
      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
        {count}
      </Text>
      <Text style={[styles.groupHeaderTotal, { color: theme.colors.primary }]}>
        {formatGroupMoney(total)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  groupHeaderLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    minWidth: 0,
  },
  groupHeaderLabelMonth: {
    fontSize: 15,
    fontWeight: '700',
  },
  groupHeaderTotal: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 88,
    textAlign: 'right',
  },
});
