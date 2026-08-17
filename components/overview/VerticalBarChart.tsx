import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { useDetailTheme } from '@/hooks/use-detail-theme';

const PRIMARY = '#467FCF';
const COMPARE = '#94A3B8';

export type VerticalBarItem = {
  id: string;
  label: string;
  value: number;
  compareValue?: number;
};

type VerticalBarChartProps = {
  items: VerticalBarItem[];
  emptyLabel?: string;
  formatValue?: (value: number) => string;
  showCompare?: boolean;
  currentLegend?: string;
  compareLegend?: string;
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

export function VerticalBarChart({
  items,
  emptyLabel = 'No data in this period.',
  formatValue = defaultFormatValue,
  showCompare = false,
  currentLegend = 'This period',
  compareLegend = 'Last month',
  maxBars = 40,
}: VerticalBarChartProps) {
  const theme = useTheme();
  const detail = useDetailTheme();

  const rows = useMemo(
    () =>
      items
        .filter(
          item =>
            (Number.isFinite(item.value) && item.value > 0) ||
            (showCompare &&
              Number.isFinite(item.compareValue) &&
              (item.compareValue ?? 0) > 0),
        )
        .slice(0, maxBars),
    [items, maxBars, showCompare],
  );

  const maxValue = useMemo(() => {
    let max = 0;
    for (const row of rows) {
      if (row.value > max) {
        max = row.value;
      }
      if (showCompare && (row.compareValue ?? 0) > max) {
        max = row.compareValue ?? 0;
      }
    }
    return max > 0 ? max : 1;
  }, [rows, showCompare]);

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: detail.label }}>{emptyLabel}</Text>
      </View>
    );
  }

  const colWidth = showCompare ? 56 : 44;

  return (
    <View style={styles.wrap}>
      {showCompare ? (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: PRIMARY }]} />
            <Text style={[styles.legendText, { color: detail.label }]}>
              {currentLegend}
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: COMPARE }]} />
            <Text style={[styles.legendText, { color: detail.label }]}>
              {compareLegend}
            </Text>
          </View>
        </View>
      ) : null}

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
            const compareH = showCompare
              ? Math.max(
                  2,
                  Math.round(
                    ((row.compareValue ?? 0) / maxValue) * CHART_HEIGHT,
                  ),
                )
              : 0;

            return (
              <View
                key={row.id}
                style={[styles.col, { width: colWidth }]}>
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
                        backgroundColor: PRIMARY,
                        width: showCompare ? 18 : 22,
                      },
                    ]}
                  />
                  {showCompare ? (
                    <View
                      style={[
                        styles.bar,
                        {
                          height: compareH,
                          backgroundColor: COMPARE,
                          width: 18,
                        },
                      ]}
                    />
                  ) : null}
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
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
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
    gap: 3,
  },
  bar: {
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
