import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import { DeliveryPreview } from '@/types/delivery';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';

function formatQty(value: number): string {
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
    case 'assigned':
      return isDark
        ? { bg: 'rgba(59, 130, 246, 0.25)', fg: '#93C5FD' }
        : { bg: '#DBEAFE', fg: '#1E40AF' };
    case 'done':
      return isDark
        ? { bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' }
        : { bg: '#DCFCE7', fg: '#166534' };
    case 'cancel':
      return isDark
        ? { bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' }
        : { bg: '#FEE2E2', fg: '#991B1B' };
    case 'waiting':
    case 'confirmed':
      return isDark
        ? { bg: 'rgba(245, 158, 11, 0.22)', fg: '#FCD34D' }
        : { bg: '#FEF3C7', fg: '#92400E' };
    default:
      return isDark
        ? { bg: '#334155', fg: '#CBD5E1' }
        : { bg: '#E2E8F0', fg: '#475569' };
  }
}

type Props = {
  delivery: DeliveryPreview | null;
  loading: boolean;
  error: string;
};

export function DeliveryDetailView({ delivery, loading, error }: Props) {
  const theme = useTheme();
  const isDark = theme.dark;
  const border = theme.colors.outlineVariant ?? theme.colors.outline;
  const muted = theme.colors.onSurfaceVariant;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12, color: muted }}>Loading delivery…</Text>
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

  if (!delivery) {
    return (
      <View style={styles.center}>
        <Text style={{ color: muted }}>Delivery not found.</Text>
      </View>
    );
  }

  const colors = statusColors(delivery.state, isDark);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: border }]}>
        <View style={styles.titleRow}>
          <Text variant="headlineSmall" style={styles.title}>
            {delivery.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.badgeText, { color: colors.fg }]}>
              {delivery.stateLabel}
            </Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <Meta label="Delivery Address" value={delivery.partner || '—'} muted={muted} />
          <Meta label="Source Document" value={delivery.origin || '—'} muted={muted} />
          <Meta
            label="Scheduled Date"
            value={
              formatMyanmarDateTime(delivery.scheduledDate, { empty: '—' }) || '—'
            }
            muted={muted}
          />
          <Meta
            label="Effective Date"
            value={
              formatMyanmarDateTime(delivery.effectiveDate, { empty: '—' }) || '—'
            }
            muted={muted}
          />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: border }]}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Operations
        </Text>

        <View style={[styles.tableHeader, { borderBottomColor: border }]}>
          <Text style={[styles.th, styles.colProduct, { color: muted }]}>Product</Text>
          <Text style={[styles.th, styles.colQty, { color: muted }]}>Demand</Text>
          <Text style={[styles.th, styles.colQty, { color: muted }]}>Quantity</Text>
          <Text style={[styles.th, styles.colUnit, { color: muted }]}>Unit</Text>
        </View>

        {delivery.lines.length === 0 ? (
          <Text style={{ color: muted, paddingVertical: 12 }}>No move lines.</Text>
        ) : (
          delivery.lines.map(line => (
            <View
              key={line.id}
              style={[styles.tableRow, { borderBottomColor: border }]}>
              <Text
                style={[styles.colProduct, styles.product, { color: theme.colors.primary }]}
                numberOfLines={3}>
                {line.product?.trim() || '—'}
              </Text>
              <Text style={[styles.colQty, styles.qty, { color: theme.colors.onSurface }]}>
                {formatQty(line.demand)}
              </Text>
              <Text style={[styles.colQty, styles.qtyBold, { color: theme.colors.onSurface }]}>
                {formatQty(line.quantity)}
              </Text>
              <Text style={[styles.colUnit, { color: muted }]} numberOfLines={1}>
                {line.unit || 'Units'}
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
  colProduct: { flex: 2.2, minWidth: 140 },
  colQty: { flex: 0.85, minWidth: 64 },
  colUnit: { flex: 0.7, minWidth: 52, fontSize: 13 },
  product: { fontSize: 14, fontWeight: '700', lineHeight: 20 },
  qty: { fontSize: 14, textAlign: 'right', fontVariant: ['tabular-nums'] },
  qtyBold: {
    fontSize: 14,
    textAlign: 'right',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
