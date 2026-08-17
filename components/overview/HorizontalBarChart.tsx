import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { useDetailTheme } from '@/hooks/use-detail-theme';

const BAR_COLORS = ['#467FCF', '#2FB344', '#F59F00', '#D63939', '#AE3EC9'];

export type HorizontalBarItem = {
  id: string;
  label: string;
  value: number;
};

type HorizontalBarChartProps = {
  items: HorizontalBarItem[];
  emptyLabel?: string;
  formatValue?: (value: number) => string;
  onItemPress?: (id: string) => void;
};

function defaultFormatValue(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (safe >= 1_000_000) {
    return `${(safe / 1_000_000).toFixed(1)}M`;
  }
  if (safe >= 10_000) {
    return `${Math.round(safe / 1000)}k`;
  }
  return safe.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function HorizontalBarChart({
  items,
  emptyLabel = 'No data in this period.',
  formatValue = defaultFormatValue,
  onItemPress,
}: HorizontalBarChartProps) {
  const theme = useTheme();
  const detail = useDetailTheme();

  const rows = useMemo(
    () =>
      items
        .filter(item => Number.isFinite(item.value) && item.value > 0)
        .slice(0, 8),
    [items],
  );

  const maxValue = useMemo(() => {
    let max = 0;
    for (const row of rows) {
      if (row.value > max) {
        max = row.value;
      }
    }
    return max > 0 ? max : 1;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: detail.label }}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {rows.map((row, index) => {
        const ratio = Math.max(0.02, row.value / maxValue);
        const color = BAR_COLORS[index % BAR_COLORS.length];
        const content = (
          <>
            <Text
              style={[styles.label, { color: detail.onSurface }]}
              numberOfLines={1}
              ellipsizeMode="tail">
              {row.label}
            </Text>
            <View
              style={[
                styles.track,
                { backgroundColor: detail.panelBg ?? detail.border },
              ]}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: color,
                    width: `${Math.round(ratio * 100)}%`,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.value, { color: theme.colors.primary }]}
              numberOfLines={1}>
              {formatValue(row.value)}
            </Text>
          </>
        );

        if (onItemPress) {
          return (
            <Pressable
              key={row.id}
              onPress={() => onItemPress(row.id)}
              style={({ pressed }) => [
                styles.row,
                pressed ? styles.rowPressed : null,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Open ${row.label}`}>
              {content}
            </Pressable>
          );
        }

        return (
          <View key={row.id} style={styles.row}>
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  list: {
    gap: 12,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowPressed: {
    opacity: 0.72,
  },
  label: {
    width: 120,
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 0,
  },
  track: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    minWidth: 48,
  },
  bar: {
    height: '100%',
    borderRadius: 7,
  },
  value: {
    width: 56,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
    flexShrink: 0,
  },
});
