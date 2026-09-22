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
  const { isMobile, width } = useResponsive();

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const atStart = page <= 1 || total === 0;
  const atEnd = page >= pageCount || total === 0;
  // Avoid crowding the footer on mid-width layouts (absolute chip used to overlap).
  const showCenter = Boolean(centerLabel) && !isMobile && width >= 1100;
  const rangeLabel = total === 0 ? '0 of 0' : `${start}–${end} of ${total}`;
  const itemWord =
    itemLabel && total > 0
      ? total === 1
        ? itemLabel
        : `${itemLabel}s`
      : null;

  return (
    <View
      style={[
        styles.container,
        isMobile && styles.containerMobile,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}>
      <View style={[styles.side, isMobile && styles.sideMobile]}>
        <Text
          variant={isMobile ? 'labelLarge' : 'bodySmall'}
          style={[styles.rangeText, { color: theme.colors.onSurface }]}
          numberOfLines={1}>
          {rangeLabel}
        </Text>
        {itemWord ? (
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={{ color: theme.colors.onSurfaceVariant }}>
            {itemWord}
          </Text>
        ) : null}
      </View>

      {showCenter ? (
        <View style={styles.center}>
          <Chip
            icon="cloud-sync"
            compact
            style={[
              styles.odooChip,
              { backgroundColor: theme.colors.secondaryContainer },
            ]}
            textStyle={[
              styles.odooChipText,
              { color: theme.colors.onSecondaryContainer },
            ]}>
            {centerLabel}
          </Chip>
        </View>
      ) : null}

      <View style={[styles.side, styles.sideRight, isMobile && styles.sideMobile]}>
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
          {total === 0 ? '0 / 0' : `${page} / ${pageCount}`}
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
    gap: 8,
  },
  containerMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingTop: 10,
    paddingBottom: 4,
    paddingLeft: 12,
    paddingRight: 4,
    gap: 2,
  },
  side: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  sideMobile: {
    flex: 0,
    width: '100%',
    justifyContent: 'center',
  },
  sideRight: {
    flex: 1,
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  center: {
    flexShrink: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 0,
  },
  rangeText: {
    fontWeight: '700',
    flexShrink: 0,
  },
  odooChip: {},
  odooChipText: {
    fontWeight: '600',
    fontSize: 12,
  },
  pageText: {
    minWidth: 56,
    textAlign: 'center',
  },
});
