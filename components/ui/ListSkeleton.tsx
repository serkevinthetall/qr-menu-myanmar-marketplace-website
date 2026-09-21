import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

type ListSkeletonProps = {
  /** Number of placeholder rows. */
  rows?: number;
  /** Approximate column flex weights (mirrors order list columns). */
  columns?: number[];
  /** Show a leading checkbox bone. */
  showCheckbox?: boolean;
};

function Bone({
  width,
  height = 14,
  style,
  opacity,
}: {
  width: number | `${number}%`;
  height?: number;
  style?: object;
  opacity: Animated.Value;
}) {
  const theme = useTheme();
  return (
    <Animated.View
      style={[
        styles.bone,
        {
          width,
          height,
          backgroundColor: theme.colors.surfaceVariant,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * List loading placeholder for ERP drawer screens (web + native).
 * Replaces a centered ActivityIndicator with row-shaped bones.
 */
export function ListSkeleton({
  rows = 8,
  columns = [1.2, 2.2, 1.4, 1.2, 1],
  showCheckbox = false,
}: ListSkeletonProps) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Loading list"
      accessibilityRole="progressbar">
      <View
        style={[
          styles.headerRow,
          {
            borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
            backgroundColor: theme.colors.surface,
          },
        ]}>
        {showCheckbox ? <View style={styles.checkCell} /> : null}
        {columns.map((flex, index) => (
          <View key={`h-${index}`} style={[styles.cell, { flex }]}>
            <Bone width="55%" height={12} opacity={pulse} />
          </View>
        ))}
      </View>
      {Array.from({ length: rows }, (_, rowIndex) => {
        const zebra = rowIndex % 2 === 1;
        return (
          <View
            key={`r-${rowIndex}`}
            style={[
              styles.row,
              {
                backgroundColor: zebra
                  ? theme.colors.surfaceVariant
                  : theme.colors.surface,
                borderBottomColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}>
            {showCheckbox ? (
              <View style={styles.checkCell}>
                <Bone width={20} height={20} style={styles.checkboxBone} opacity={pulse} />
              </View>
            ) : null}
            {columns.map((flex, colIndex) => (
              <View key={`c-${rowIndex}-${colIndex}`} style={[styles.cell, { flex }]}>
                <Bone
                  width={colIndex === 0 ? '70%' : colIndex === columns.length - 1 ? '50%' : '85%'}
                  height={colIndex === 1 ? 16 : 14}
                  opacity={pulse}
                />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}

/** Compact centered skeleton for detail panes. */
export function DetailSkeleton({ lines = 6 }: { lines?: number }) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.9,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View
      style={[styles.detailRoot, { backgroundColor: theme.colors.background }]}
      accessibilityLabel="Loading detail"
      accessibilityRole="progressbar">
      <Bone width="40%" height={22} opacity={pulse} style={{ marginBottom: 16 }} />
      {Array.from({ length: lines }, (_, i) => (
        <Bone
          key={i}
          width={i % 3 === 0 ? '92%' : i % 3 === 1 ? '78%' : '64%'}
          height={14}
          opacity={pulse}
          style={{ marginBottom: 12 }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkCell: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBone: {
    borderRadius: 4,
  },
  cell: {
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  bone: {
    borderRadius: 6,
  },
  detailRoot: {
    flex: 1,
    padding: 24,
  },
});
