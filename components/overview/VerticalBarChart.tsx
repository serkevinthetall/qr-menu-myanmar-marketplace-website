import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { useDetailTheme } from '@/hooks/use-detail-theme';

export type VerticalBarItem = {
  id: string;
  label: string;
  value: number;
};

type VerticalBarChartProps = {
  items: VerticalBarItem[];
  emptyLabel?: string;
  formatValue?: (value: number) => string;
  barColor?: string;
  /** Max bars to render (horizontal scroll if many). */
  maxBars?: number;
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

const CHART_HEIGHT = 180;
const DEFAULT_BAR = '#467FCF';

export function VerticalBarChart({
  items,
  emptyLabel = 'No data in this period.',
  formatValue = defaultFormatValue,
  barColor = DEFAULT_BAR,
  maxBars = 40,
}: VerticalBarChartProps) {
  const theme = useTheme();
  const detail = useDetailTheme();

  const rows = useMemo(
    () =>
      items
        .filter(item => Number.isFinite(item.value) && item.value > 0)
        .slice(0, maxBars),
    [items, maxBars],
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
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.scrollContent}>
        <View style={[styles.chartRow, { minHeight: CHART_HEIGHT + 56 }]}>
          {rows.map(row => {
            const h = Math.max(
              4,
              Math.round((row.value / maxValue) * CHART_HEIGHT),
            );

            return (
              <View key={row.id} style={styles.col}>
                <Text
                  style={[styles.valueLabel, { color: theme.colors.primary }]}
                  numberOfLines={1}>
                  {formatValue(row.value)}
                </Text>
                <View style={[styles.bars, { height: CHART_HEIGHT }]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: h,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.axisLabel, { color: detail.onSurface }]}
                  numberOfLines={2}>
                  {row.label}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  empty: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  scrollContent: {
    paddingRight: 8,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 4,
  },
  col: {
    width: 44,
    alignItems: 'center',
    gap: 4,
  },
  valueLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bar: {
    width: 22,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  axisLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 13,
    minHeight: 28,
  },
});
