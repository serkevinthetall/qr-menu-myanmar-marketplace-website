import { useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
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

const CHART_HEIGHT = 220;
const DEFAULT_BAR = '#467FCF';
const MIN_COL_WIDTH = 72;
const COL_GAP = 10;

export function VerticalBarChart({
  items,
  emptyLabel = 'No data in this period.',
  formatValue = defaultFormatValue,
  barColor = DEFAULT_BAR,
  maxBars = 40,
}: VerticalBarChartProps) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const [trackWidth, setTrackWidth] = useState(0);

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

  const gaps = COL_GAP * Math.max(0, rows.length - 1);
  const fillsTrack =
    trackWidth > 0 &&
    rows.length * MIN_COL_WIDTH + gaps <= trackWidth;
  const colWidth = fillsTrack
    ? Math.floor((trackWidth - gaps) / rows.length)
    : MIN_COL_WIDTH;
  const barWidth = Math.max(16, Math.min(48, Math.round(colWidth * 0.42)));

  const onLayout = (event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    if (next > 0 && next !== trackWidth) {
      setTrackWidth(next);
    }
  };

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: detail.label }}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <ScrollView
        horizontal
        scrollEnabled={!fillsTrack}
        showsHorizontalScrollIndicator={!fillsTrack}
        contentContainerStyle={[
          styles.scrollContent,
          fillsTrack ? styles.scrollFill : null,
        ]}>
        <View
          style={[
            styles.chartRow,
            { minHeight: CHART_HEIGHT + 72, gap: COL_GAP },
            fillsTrack ? styles.chartFill : null,
          ]}>
          {rows.map(row => {
            const h = Math.max(
              4,
              Math.round((row.value / maxValue) * CHART_HEIGHT),
            );

            return (
              <View key={row.id} style={[styles.col, { width: colWidth }]}>
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
                        width: barWidth,
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
    width: '100%',
    alignSelf: 'stretch',
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
  scrollFill: {
    flexGrow: 1,
    width: '100%',
    paddingRight: 0,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  chartFill: {
    width: '100%',
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
    width: '100%',
    paddingHorizontal: 2,
  },
});
