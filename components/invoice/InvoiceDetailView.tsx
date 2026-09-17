import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import { InvoicePreview } from '@/types/invoice';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

function formatMoney(value: number): string {
  if (!Number.isFinite(value)) {
    return '0.00';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

type Props = {
  invoice: InvoicePreview | null;
  loading: boolean;
  error: string;
};

export function InvoiceDetailView({ invoice, loading, error }: Props) {
  const theme = useTheme();
  const isDark = theme.dark;
  const border = theme.colors.outlineVariant ?? theme.colors.outline;
  const muted = theme.colors.onSurfaceVariant;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12, color: muted }}>Loading invoice…</Text>
      </View>
    );
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

  if (!invoice) {
    return (
      <View style={styles.center}>
        <Text style={{ color: muted }}>Invoice not found.</Text>
      </View>
    );
  }

  const colors = statusColors(invoice.state, isDark);
  const currency = invoice.currency ? ` ${invoice.currency}` : '';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: border }]}>
        <View style={styles.titleRow}>
          <Text variant="headlineSmall" style={styles.title}>
            {invoice.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.fg }]}>
              {invoice.stateLabel}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <Meta label="Customer" value={invoice.partner || '—'} muted={muted} />
          <Meta label="Source Document" value={invoice.origin || '—'} muted={muted} />
          <Meta
            label="Invoice Date"
            value={formatMyanmarDate(invoice.invoiceDate) || '—'}
            muted={muted}
          />
          <Meta
            label="Payment Status"
            value={invoice.paymentStateLabel || '—'}
            muted={muted}
          />
          <Meta
            label="Untaxed Amount"
            value={`${formatMoney(invoice.amountUntaxed)}${currency}`}
            muted={muted}
          />
          <Meta
            label="Total"
            value={`${formatMoney(invoice.amountTotal)}${currency}`}
            muted={muted}
          />
          <Meta
            label="Amount Due"
            value={`${formatMoney(invoice.amountResidual)}${currency}`}
            muted={muted}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: border }]}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Invoice Lines
        </Text>

        <View style={[styles.tableHeader, { borderBottomColor: border }]}>
          <Text style={[styles.th, styles.colProduct, { color: muted }]}>Product</Text>
          <Text style={[styles.th, styles.colQty, { color: muted }]}>Qty</Text>
          <Text style={[styles.th, styles.colQty, { color: muted }]}>Price</Text>
          <Text style={[styles.th, styles.colQty, { color: muted }]}>Amount</Text>
        </View>

        {invoice.lines.length === 0 ? (
          <Text style={{ color: muted, paddingVertical: 12 }}>No invoice lines.</Text>
        ) : (
          invoice.lines.map(line => (
            <View
              key={line.id}
              style={[styles.tableRow, { borderBottomColor: border }]}>
              <View style={styles.colProduct}>
                <Text
                  style={[styles.product, { color: theme.colors.primary }]}
                  numberOfLines={3}>
                  {line.product?.trim() || '—'}
                </Text>
                {line.unit ? (
                  <Text style={{ color: muted, fontSize: 12 }}>{line.unit}</Text>
                ) : null}
              </View>
              <Text style={[styles.colQty, styles.qty, { color: theme.colors.onSurface }]}>
                {formatMoney(line.quantity)}
              </Text>
              <Text style={[styles.colQty, styles.qty, { color: theme.colors.onSurface }]}>
                {formatMoney(line.unitPrice)}
              </Text>
              <Text style={[styles.colQty, styles.qtyBold, { color: theme.colors.onSurface }]}>
                {formatMoney(line.amount)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function Meta({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.metaItem}>
      <Text style={[styles.metaLabel, { color: muted }]}>{label}</Text>
      <Text style={{ color: theme.colors.onSurface, fontSize: 14 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 16,
    gap: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { flex: 1, fontWeight: '700' },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700' },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  metaItem: { width: '47%', minWidth: 160, gap: 4 },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  sectionTitle: { fontWeight: '700' },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  colProduct: { flex: 2.2, minWidth: 140, gap: 2 },
  colQty: { flex: 0.85, minWidth: 64 },
  product: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  qty: { fontSize: 14, textAlign: 'right', fontVariant: ['tabular-nums'] },
  qtyBold: {
    fontSize: 14,
    textAlign: 'right',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
