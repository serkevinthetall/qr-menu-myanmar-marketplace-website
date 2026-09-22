import { StyleSheet, View } from 'react-native';
import { Chip, IconButton, Text, useTheme } from 'react-native-paper';

import { useResponsive } from '@/hooks/use-responsive';

type PaginationProps = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  centerLabel?: string;
  /** Singular noun shown after the count, e.g. "order" → "12 orders". */
  itemLabel?: string;
};

/** Below this width, range + controls stack so they never overlap. */
const STACK_BREAKPOINT = 1100;
/** Odoo chip only when there is real room beside both sides. */
const CENTER_CHIP_BREAKPOINT = 1280;

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
  centerLabel,
  itemLabel,
}: PaginationProps) {
  const theme = useTheme();
  const { width } = useResponsive();

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const atStart = page <= 1 || total === 0;
  const atEnd = page >= pageCount || total === 0;
  const stacked = width < STACK_BREAKPOINT;
  const showCenter =
    Boolean(centerLabel) && !stacked && width >= CENTER_CHIP_BREAKPOINT;
  const rangeLabel = total === 0 ? '0 of 0' : `${start}–${end} of ${total}`;
  const itemWord =
    itemLabel && total > 0
      ? total === 1
        ? itemLabel
        : `${itemLabel}s`
      : null;
  const pageLabel = total === 0 ? '0 / 0' : `${page} / ${pageCount}`;

  return (
    <View
      style={[
        styles.container,
        stacked && styles.containerStacked,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}>
      <View style={[styles.rangeSide, stacked && styles.rangeSideStacked]}>
        <Text
          variant={stacked ? 'labelLarge' : 'bodySmall'}
          style={[styles.rangeText, { color: theme.colors.onSurface }]}
          numberOfLines={1}
          ellipsizeMode="tail">
          {rangeLabel}
          {itemWord ? ` ${itemWord}` : ''}
        </Text>
      </View>

      {showCenter ? (
        <View style={styles.center}>
          <Chip
            icon="cloud-sync"
            compact
            style={{ backgroundColor: theme.colors.secondaryContainer }}
            textStyle={[
              styles.odooChipText,
              { color: theme.colors.onSecondaryContainer },
            ]}>
            {centerLabel}
          </Chip>
        </View>
      ) : null}

      <View style={[styles.controls, stacked && styles.controlsStacked]}>
        <IconButton
          icon="chevron-double-left"
          size={20}
          disabled={atStart}
          onPress={() => onChange(1)}
          accessibilityLabel="First page"
        />
        <IconButton
          icon="chevron-left"
          size={20}
          disabled={atStart}
          onPress={() => onChange(page - 1)}
          accessibilityLabel="Previous page"
        />
        <Text
          variant="labelLarge"
          style={[styles.pageText, { color: theme.colors.onSurface }]}
          numberOfLines={1}>
          {pageLabel}
        </Text>
        <IconButton
          icon="chevron-right"
          size={20}
          disabled={atEnd}
          onPress={() => onChange(page + 1)}
          accessibilityLabel="Next page"
        />
        <IconButton
          icon="chevron-double-right"
          size={20}
          disabled={atEnd}
          onPress={() => onChange(pageCount)}
          accessibilityLabel="Last page"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
    gap: 12,
    overflow: 'hidden',
  },
  containerStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingTop: 10,
    paddingBottom: 4,
    paddingLeft: 12,
    paddingRight: 4,
    gap: 0,
  },
  rangeSide: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  rangeSideStacked: {
    flex: 0,
    width: '100%',
    alignItems: 'center',
    paddingBottom: 2,
  },
  rangeText: {
    fontWeight: '700',
  },
  center: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'flex-end',
  },
  controlsStacked: {
    width: '100%',
    justifyContent: 'center',
  },
  odooChipText: {
    fontWeight: '600',
    fontSize: 12,
  },
  pageText: {
    minWidth: 56,
    textAlign: 'center',
  },
});
