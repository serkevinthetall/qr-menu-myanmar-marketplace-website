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
};

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
  centerLabel,
}: PaginationProps) {
  const theme = useTheme();
  const { isMobile } = useResponsive();

  if (total === 0) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const atStart = page <= 1;
  const atEnd = page >= pageCount;
  const showCenter = !!centerLabel && !isMobile;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}>
      <View style={styles.side}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {start}–{end} of {total}
        </Text>
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

      <View style={[styles.side, styles.sideRight]}>
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
          {page} / {pageCount}
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
  side: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  sideRight: {
    justifyContent: 'flex-end',
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
