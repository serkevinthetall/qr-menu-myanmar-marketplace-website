import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

type Props = {
  count: number;
  onPress?: () => void;
};

/**
 * Odoo online-style Delivery smart button (stat button):
 * big count, truck icon, "Delivery" label.
 */
export function DeliverySmartButton({ count, onPress }: Props) {
  const theme = useTheme();
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }

  const label = count === 1 ? 'Delivery' : 'Deliveries';
  const border = theme.colors.outlineVariant ?? theme.colors.outline;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${count} ${label}`}
      style={({ pressed, hovered }) => [
        styles.button,
        {
          borderColor: border,
          backgroundColor:
            pressed || hovered
              ? theme.colors.primaryContainer
              : theme.colors.surface,
          opacity: pressed ? 0.92 : 1,
        },
      ]}>
      <Text style={[styles.count, { color: theme.colors.onSurface }]}>
        {count}
      </Text>
      <Icon
        source="truck-delivery-outline"
        size={20}
        color={theme.colors.onSurfaceVariant}
      />
      <Text
        style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
        numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    minWidth: 88,
  },
  count: {
    fontSize: 22,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    lineHeight: 26,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});
