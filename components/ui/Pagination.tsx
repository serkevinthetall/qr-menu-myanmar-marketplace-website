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
  const { isMobile } = useResponsive();

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const atStart = page <= 1 || total === 0;
  const atEnd = page >= pageCount || total === 0;
  const showCenter = !!centerLabel && !isMobile;
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
          style={[
            styles.rangeText,
            { color: theme.colors.onSurface },
          ]}>
          {rangeLabel}
        </Text>
        {itemWord ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}>
            {itemWord}
          </Text>
        ) : null}
      </View>

      {showCenter ? (
        <View style={styles.centerOverlay} pointerEvents="box-none">
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
        <Text variant="labelLarge" style={[styles.pageText, { color: theme.colors.onSurface }]}>
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
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  sideMobile: {
    flex: 0,
    width: '100%',
    justifyContent: 'center',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  rangeText: {
    fontWeight: '700',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
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
