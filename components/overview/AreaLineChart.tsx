import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';

import { useDetailTheme } from '@/hooks/use-detail-theme';
import { OverviewAreaSeries } from '@/types/overview';

const LINE_COLORS = ['#467FCF', '#2FB344', '#F59F00', '#D63939', '#AE3EC9'];

type AreaLineChartProps = {
  buckets: string[];
  series: OverviewAreaSeries[];
  height?: number;
  emptyLabel?: string;
};

function shortBucketLabel(bucket: string): string {
  if (bucket.includes('T')) {
    const hour = bucket.slice(-2);
    return `${Number(hour)}h`;
  }
  // YYYY-MM-DD → MM/DD
  const parts = bucket.split('-');
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}`;
  }
  return bucket;
}

export function AreaLineChart({
  buckets,
  series,
  height = 220,
  emptyLabel = 'No area sales in this period.',
}: AreaLineChartProps) {
  const theme = useTheme();
  const detail = useDetailTheme();

  const width = 640;
  const padding = { top: 16, right: 16, bottom: 28, left: 44 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const maxValue = useMemo(() => {
    let max = 0;
    for (const row of series) {
      for (const point of row.points) {
        if (point.value > max) {
          max = point.value;
        }
      }
    }
    return max > 0 ? max : 1;
  }, [series]);

  const xFor = (index: number) => {
    if (buckets.length <= 1) {
      return padding.left + plotW / 2;
    }
    return padding.left + (index / (buckets.length - 1)) * plotW;
  };

  const yFor = (value: number) =>
    padding.top + plotH - (value / maxValue) * plotH;

  if (series.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={{ color: detail.label }}>{emptyLabel}</Text>
      </View>
    );
  }

  const labelStep = Math.max(1, Math.ceil(buckets.length / 8));

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = padding.top + plotH * (1 - ratio);
          return (
            <Line
              key={`g-${ratio}`}
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke={detail.border}
              strokeWidth={1}
            />
          );
        })}

        {buckets.map((bucket, index) => {
          if (index % labelStep !== 0 && index !== buckets.length - 1) {
            return null;
          }
          return (
            <SvgText
              key={`x-${bucket}`}
              x={xFor(index)}
              y={height - 8}
              fill={detail.label}
              fontSize={10}
              textAnchor="middle">
              {shortBucketLabel(bucket)}
            </SvgText>
          );
        })}

        <SvgText
          x={8}
          y={padding.top + 4}
          fill={detail.label}
          fontSize={10}>
          {Math.round(maxValue).toLocaleString()}
        </SvgText>

        {series.map((row, seriesIndex) => {
          const color = LINE_COLORS[seriesIndex % LINE_COLORS.length];
          const points = row.points
            .map((point, index) => `${xFor(index)},${yFor(point.value)}`)
            .join(' ');
          return (
            <Polyline
              key={row.name}
              points={points}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          );
        })}

        {series.map((row, seriesIndex) => {
          const color = LINE_COLORS[seriesIndex % LINE_COLORS.length];
          return row.points.map((point, index) => (
            <Circle
              key={`${row.name}-${point.bucket}`}
              cx={xFor(index)}
              cy={yFor(point.value)}
              r={2.5}
              fill={color}
            />
          ));
        })}
      </Svg>

      <View style={styles.legend}>
        {series.map((row, index) => (
          <View key={row.name} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: LINE_COLORS[index % LINE_COLORS.length] },
              ]}
            />
            <Text
              style={[styles.legendText, { color: theme.colors.onSurface }]}
              numberOfLines={1}>
              {row.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '48%',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});
