import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';

import { useDetailTheme } from '@/hooks/use-detail-theme';

const BAR_COLORS = ['#467FCF', '#2FB344', '#F59F00', '#D63939', '#AE3EC9'];

export type HorizontalBarItem = {
  id: string;
  label: string;
  value: number;
  meta?: string;
};

type HorizontalBarChartProps = {
  items: HorizontalBarItem[];
  emptyLabel?: string;
  formatValue?: (value: number) => string;
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

  const width = 640;
  const rowH = 44;
  const padding = { top: 8, right: 72, bottom: 8, left: 128 };
  const chartH = padding.top + padding.bottom + rows.length * rowH;
  const plotW = width - padding.left - padding.right;

  return (
    <Svg width="100%" height={chartH} viewBox={`0 0 ${width} ${chartH}`}>
      {rows.map((row, index) => {
        const y = padding.top + index * rowH;
        const barW = Math.max(4, (row.value / maxValue) * plotW);
        const color = BAR_COLORS[index % BAR_COLORS.length];
        const label =
          row.label.length > 18 ? `${row.label.slice(0, 17)}…` : row.label;

        return (
          <Svg key={row.id}>
            <SvgText
              x={padding.left - 10}
              y={y + 24}
              fill={detail.onSurface}
              fontSize={12}
              fontWeight="700"
              textAnchor="end">
              {label}
            </SvgText>
            <Rect
              x={padding.left}
              y={y + 12}
              width={barW}
              height={18}
              rx={6}
              fill={color}
              opacity={0.92}
            />
            <SvgText
              x={padding.left + barW + 8}
              y={y + 25}
              fill={theme.colors.primary}
              fontSize={12}
              fontWeight="800">
              {formatValue(row.value)}
            </SvgText>
          </Svg>
        );
      })}
    </Svg>
  );
}

const styles = StyleSheet.create({
  empty: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
});
