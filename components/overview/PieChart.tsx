import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { Text } from 'react-native-paper';

import { useDetailTheme } from '@/hooks/use-detail-theme';

const SLICE_COLORS = [
  '#467FCF',
  '#2FB344',
  '#F59F00',
  '#D63939',
  '#AE3EC9',
  '#0CA678',
  '#F76707',
  '#7048E8',
];

export type PieChartItem = {
  id: string;
  label: string;
  value: number;
  color?: string;
};

type PieChartProps = {
  items: PieChartItem[];
  emptyLabel?: string;
  size?: number;
};

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSlice(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
}

export function PieChart({
  items,
  emptyLabel = 'No data in this period.',
  size = 200,
}: PieChartProps) {
  const detail = useDetailTheme();

  const rows = useMemo(
    () =>
      items
        .filter(item => Number.isFinite(item.value) && item.value > 0)
        .map((item, index) => ({
          ...item,
          color: item.color || SLICE_COLORS[index % SLICE_COLORS.length],
        })),
    [items],
  );

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + row.value, 0),
    [rows],
  );

  const slices = useMemo(() => {
    if (total <= 0) {
      return [];
    }
    let cursor = 0;
    return rows.map(row => {
      const startAngle = (cursor / total) * 360;
      cursor += row.value;
      const endAngle = (cursor / total) * 360;
      // Full circle needs a tiny gap so the arc path still draws.
      const safeEnd = endAngle - startAngle >= 359.99 ? startAngle + 359.99 : endAngle;
      return {
        ...row,
        startAngle,
        endAngle: safeEnd,
        percent: (row.value / total) * 100,
      };
    });
  }, [rows, total]);

  if (slices.length === 0) {
    return (
      <View style={[styles.empty, { minHeight: size }]}>
        <Text style={{ color: detail.label }}>{emptyLabel}</Text>
      </View>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.42;

  return (
    <View style={styles.root}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {slices.map(slice => (
            <Path
              key={slice.id}
              d={describeSlice(cx, cy, r, slice.startAngle, slice.endAngle)}
              fill={slice.color}
            />
          ))}
        </G>
      </Svg>
      <View style={styles.legend}>
        {slices.map(slice => (
          <View key={slice.id} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: slice.color }]} />
            <Text
              style={[styles.legendLabel, { color: detail.onSurface }]}
              numberOfLines={1}>
              {slice.label}
            </Text>
            <Text style={[styles.legendValue, { color: detail.label }]}>
              {slice.value.toLocaleString()} · {slice.percent.toFixed(0)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  legend: {
    flex: 1,
    minWidth: 180,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 12,
    fontWeight: '600',
  },
});
