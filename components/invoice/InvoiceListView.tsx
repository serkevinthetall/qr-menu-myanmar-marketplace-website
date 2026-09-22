import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { InvoicePreview } from '@/types/invoice';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

function statusColors(state: string, isDark: boolean) {
  switch (state) {
    case 'draft':
      return isDark
        ? { bg: 'rgba(245, 158, 11, 0.22)', fg: '#FCD34D' }
        : { bg: '#FEF3C7', fg: '#92400E' };
    case 'posted':
      return isDark
        ? { bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' }
        : { bg: '#DCFCE7', fg: '#166534' };
    case 'cancel':
      return isDark
        ? { bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' }
        : { bg: '#FEE2E2', fg: '#991B1B' };
    default:
      return isDark
        ? { bg: '#334155', fg: '#CBD5E1' }
        : { bg: '#E2E8F0', fg: '#475569' };
  }
}

function formatMoney(value: number, currency?: string): string {
  const amount = Number.isFinite(value)
    ? value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';
  return currency ? `${amount} ${currency}` : amount;
}

type Props = {
  invoices: InvoicePreview[];
  loading: boolean;
  error: string;
  onOpen: (invoiceId: string) => void;
};

export function InvoiceListView({
  invoices,
  loading,
  error,
  onOpen,
}: Props) {
  const theme = useTheme();
  const isDark = theme.dark;
  const border = theme.colors.outlineVariant ?? theme.colors.outline;
  const muted = theme.colors.onSurfaceVariant;

  if (loading) {
    return <ListSkeleton variant="invoices" />;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.colors.error, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (invoices.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: muted, textAlign: 'center' }}>
          No customer invoices found for this order.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.headerRow,
          { backgroundColor: theme.colors.primary },
        ]}>
        <Text style={[styles.th, styles.colName, { color: theme.colors.onPrimary }]}>
          Number
        </Text>
        <Text style={[styles.th, styles.colStatus, { color: theme.colors.onPrimary }]}>
          Status
        </Text>
        <Text style={[styles.th, styles.colDate, { color: theme.colors.onPrimary }]}>
          Date
        </Text>
        <Text style={[styles.th, styles.colTotal, { color: theme.colors.onPrimary }]}>
          Total
        </Text>
      </View>

      {invoices.map((item, index) => {
        const colors = statusColors(item.state, isDark);
        const zebra = index % 2 === 1;
        return (
          <Pressable
            key={item.id}
            onPress={() => onOpen(item.id)}
            style={({ pressed, hovered }) => [
              styles.row,
              {
                backgroundColor: pressed || hovered
                  ? theme.colors.primaryContainer
                  : zebra
                    ? theme.colors.surfaceVariant
                    : theme.colors.surface,
                borderBottomColor: border,
              },
            ]}>
            <View style={styles.colName}>
              <View style={styles.nameRow}>
                <Icon
                  source="file-document-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.name, { color: theme.colors.primary }]}
                  numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              {item.paymentStateLabel ? (
                <Text style={{ color: muted, fontSize: 12 }} numberOfLines={1}>
                  {item.paymentStateLabel}
                </Text>
              ) : null}
            </View>
            <View style={styles.colStatus}>
              <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                <Text style={[styles.badgeText, { color: colors.fg }]}>
                  {item.stateLabel}
                </Text>
              </View>
            </View>
            <Text
              style={[styles.cell, styles.colDate, { color: theme.colors.onSurface }]}
              numberOfLines={1}>
              {formatMyanmarDate(item.invoiceDate) || '—'}
            </Text>
            <Text
              style={[styles.cell, styles.colTotal, { color: theme.colors.onSurface }]}
              numberOfLines={1}>
              {formatMoney(item.amountTotal, item.currency)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    minHeight: 56,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cell: { fontSize: 13 },
  colName: { flex: 2.2, minWidth: 140, gap: 2 },
  colStatus: { flex: 0.9, minWidth: 88 },
  colDate: { flex: 1.0, minWidth: 96 },
  colTotal: { flex: 1.1, minWidth: 100, textAlign: 'right' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontWeight: '700', fontSize: 14, flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
