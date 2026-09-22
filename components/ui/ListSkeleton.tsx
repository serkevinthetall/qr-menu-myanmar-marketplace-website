import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';

/** Page-shaped loading placeholders — match real list columns per screen. */
export type ListSkeletonVariant =
  | 'quotations'
  | 'saleOrders'
  | 'appOrders'
  | 'contacts'
  | 'products'
  | 'purchaseOrders'
  | 'vendors'
  | 'memberships'
  | 'membershipCoupons'
  | 'memberRequests'
  | 'callList'
  | 'onHand'
  | 'movesHistory'
  | 'appPromoters'
  | 'appPromoterCommissions'
  | 'invoices'
  | 'deliveries';

type CellShape = 'text' | 'avatarText' | 'badge' | 'button' | 'thumb';

type ColumnSpec = {
  flex: number;
  shape?: CellShape;
  /** Bone width inside the cell (percent of cell). */
  boneWidth?: `${number}%`;
};

type VariantConfig = {
  columns: ColumnSpec[];
  showCheckbox?: boolean;
  rows?: number;
};

const VARIANTS: Record<ListSkeletonVariant, VariantConfig> = {
  quotations: {
    showCheckbox: true,
    columns: [
      { flex: 1.4 },
      { flex: 1.5 },
      { flex: 2.0 },
      { flex: 1.4 },
      { flex: 1.4 },
      { flex: 1.4, boneWidth: '70%' },
      { flex: 1.3, shape: 'badge', boneWidth: '80%' },
      { flex: 1.5 },
    ],
  },
  saleOrders: {
    showCheckbox: true,
    columns: [
      { flex: 1.3 },
      { flex: 1.4 },
      { flex: 1.8 },
      { flex: 1.4 },
      { flex: 1.4, boneWidth: '70%' },
      { flex: 1.3, shape: 'badge', boneWidth: '80%' },
    ],
  },
  appOrders: {
    showCheckbox: true,
    columns: [
      { flex: 1.2 },
      { flex: 1.3 },
      { flex: 1.6 },
      { flex: 1.2 },
      { flex: 1.3 },
      { flex: 1.3, boneWidth: '70%' },
      { flex: 1.2, shape: 'badge', boneWidth: '80%' },
    ],
  },
  contacts: {
    showCheckbox: true,
    columns: [
      { flex: 2.2, shape: 'avatarText', boneWidth: '72%' },
      { flex: 1.4 },
      { flex: 1.9 },
      { flex: 1.6, shape: 'badge', boneWidth: '75%' },
      { flex: 1.3, boneWidth: '65%' },
      { flex: 1.8, shape: 'button', boneWidth: '90%' },
      { flex: 1.6, shape: 'button', boneWidth: '90%' },
    ],
  },
  products: {
    showCheckbox: true,
    columns: [
      { flex: 2.6, shape: 'thumb', boneWidth: '70%' },
      { flex: 1.8 },
      { flex: 1.6, boneWidth: '60%' },
      { flex: 1, boneWidth: '50%' },
      { flex: 1.2, shape: 'badge', boneWidth: '75%' },
    ],
  },
  purchaseOrders: {
    columns: [
      { flex: 1.4 },
      { flex: 1.5 },
      { flex: 2.2 },
      { flex: 1.5, boneWidth: '70%' },
      { flex: 1.4, shape: 'badge', boneWidth: '80%' },
    ],
  },
  vendors: {
    showCheckbox: true,
    columns: [
      { flex: 2.2, shape: 'avatarText', boneWidth: '72%' },
      { flex: 1.4 },
      { flex: 1.2 },
      { flex: 1.9 },
      { flex: 1.4, shape: 'badge', boneWidth: '75%' },
      { flex: 1.3, boneWidth: '65%' },
      { flex: 1.3, boneWidth: '65%' },
      { flex: 1.0, boneWidth: '50%' },
      { flex: 1.5 },
    ],
  },
  memberships: {
    columns: [
      { flex: 1.6 },
      { flex: 1.3 },
      { flex: 2.2 },
      { flex: 1.4 },
      { flex: 1.3, boneWidth: '55%' },
      { flex: 1.4, shape: 'badge', boneWidth: '80%' },
    ],
  },
  membershipCoupons: {
    columns: [
      { flex: 1.5 },
      { flex: 1.3 },
      { flex: 2.0 },
      { flex: 1.4 },
      { flex: 1.4, boneWidth: '60%' },
      { flex: 1.3, shape: 'badge', boneWidth: '80%' },
    ],
  },
  memberRequests: {
    columns: [
      { flex: 1.6 },
      { flex: 1.8 },
      { flex: 1.1 },
      { flex: 1.4 },
      { flex: 1.6 },
      { flex: 1.3, shape: 'badge', boneWidth: '80%' },
      { flex: 1.5 },
      { flex: 1.6 },
    ],
  },
  callList: {
    columns: [
      { flex: 2.2, shape: 'avatarText', boneWidth: '70%' },
      { flex: 1.6, shape: 'badge', boneWidth: '80%' },
      { flex: 1.4 },
      { flex: 1.4 },
      { flex: 1.5 },
    ],
  },
  onHand: {
    columns: [
      { flex: 2.4 },
      { flex: 1.2 },
      { flex: 1.4 },
      { flex: 1, boneWidth: '55%' },
      { flex: 0.8, boneWidth: '50%' },
    ],
  },
  movesHistory: {
    columns: [
      { flex: 1 },
      { flex: 1.3 },
      { flex: 2 },
      { flex: 1.3 },
      { flex: 1.3 },
      { flex: 0.85, boneWidth: '55%' },
      { flex: 1.1 },
    ],
  },
  appPromoters: {
    columns: [
      { flex: 2.2, shape: 'avatarText', boneWidth: '70%' },
      { flex: 1.2, boneWidth: '60%' },
      { flex: 1, shape: 'badge', boneWidth: '75%' },
      { flex: 1.2, shape: 'button', boneWidth: '85%' },
    ],
  },
  appPromoterCommissions: {
    columns: [
      { flex: 1 },
      { flex: 1.1 },
      { flex: 1.4 },
      { flex: 1 },
      { flex: 1, boneWidth: '65%' },
    ],
  },
  invoices: {
    rows: 6,
    columns: [
      { flex: 2.2 },
      { flex: 0.9, shape: 'badge', boneWidth: '80%' },
      { flex: 1.0 },
      { flex: 1.1, boneWidth: '65%' },
    ],
  },
  deliveries: {
    rows: 6,
    columns: [
      { flex: 2.2 },
      { flex: 0.9, shape: 'badge', boneWidth: '80%' },
      { flex: 1.2 },
      { flex: 0.5, boneWidth: '45%' },
    ],
  },
};

type ListSkeletonProps = {
  /** Which screen this skeleton mirrors. */
  variant: ListSkeletonVariant;
  /** Override row count (defaults per variant, else 10). */
  rows?: number;
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

function CellBones({
  col,
  opacity,
}: {
  col: ColumnSpec;
  opacity: Animated.Value;
}) {
  const shape = col.shape ?? 'text';
  const boneWidth = col.boneWidth ?? '82%';

  if (shape === 'avatarText') {
    return (
      <View style={styles.avatarRow}>
        <Bone width={26} height={26} style={styles.avatarBone} opacity={opacity} />
        <Bone width={boneWidth} height={14} opacity={opacity} style={styles.avatarTextBone} />
      </View>
    );
  }
  if (shape === 'thumb') {
    return (
      <View style={styles.avatarRow}>
        <Bone width={32} height={32} style={styles.thumbBone} opacity={opacity} />
        <Bone width={boneWidth} height={14} opacity={opacity} style={styles.avatarTextBone} />
      </View>
    );
  }
  if (shape === 'badge') {
    return <Bone width={boneWidth} height={22} style={styles.badgeBone} opacity={opacity} />;
  }
  if (shape === 'button') {
    return <Bone width={boneWidth} height={28} style={styles.buttonBone} opacity={opacity} />;
  }
  return <Bone width={boneWidth} height={14} opacity={opacity} />;
}

/**
 * List loading placeholder shaped like the target page’s table.
 */
export function ListSkeleton({ variant, rows }: ListSkeletonProps) {
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(0.45)).current;
  const config = VARIANTS[variant];
  const columns = config.columns;
  const showCheckbox = Boolean(config.showCheckbox);
  const rowCount = rows ?? config.rows ?? 10;

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

  const headerBones = useMemo(
    () =>
      columns.map((col, index) => (
        <View key={`h-${index}`} style={[styles.cell, { flex: col.flex }]}>
          <Bone width="50%" height={11} opacity={pulse} />
        </View>
      )),
    [columns, pulse],
  );

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
      accessibilityLabel={`Loading ${variant}`}
      accessibilityRole="progressbar">
      <View
        style={[
          styles.headerRow,
          {
            borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
            backgroundColor: theme.colors.primary,
          },
        ]}>
        {showCheckbox ? <View style={styles.checkCell} /> : null}
        {headerBones}
      </View>
      {Array.from({ length: rowCount }, (_, rowIndex) => {
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
                <Bone
                  width={18}
                  height={18}
                  style={styles.checkboxBone}
                  opacity={pulse}
                />
              </View>
            ) : null}
            {columns.map((col, colIndex) => (
              <View
                key={`c-${rowIndex}-${colIndex}`}
                style={[styles.cell, { flex: col.flex }]}>
                <CellBones col={col} opacity={pulse} />
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
    paddingTop: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkCell: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBone: {
    borderRadius: 4,
  },
  cell: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    minWidth: 0,
  },
  bone: {
    borderRadius: 6,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarBone: {
    borderRadius: 13,
    flexShrink: 0,
  },
  thumbBone: {
    borderRadius: 6,
    flexShrink: 0,
  },
  avatarTextBone: {
    flexShrink: 1,
  },
  badgeBone: {
    borderRadius: 999,
  },
  buttonBone: {
    borderRadius: 6,
  },
  detailRoot: {
    flex: 1,
    padding: 24,
  },
});
