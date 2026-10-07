import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { JournalEntryDetail } from '@/types/journal-entry';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

function formatMoney(value: number, currency?: string): string {
  const amount = Number.isFinite(value)
    ? value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';
  return currency ? `${amount} ${currency}` : amount;
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

function paymentColors(label: string, isDark: boolean) {
  const key = label.toLowerCase();
  if (key.includes('paid') && !key.includes('not') && !key.includes('partial')) {
    return isDark
      ? { bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' }
      : { bg: '#DCFCE7', fg: '#166534' };
  }
  if (key.includes('payment') || key.includes('partial')) {
    return isDark
      ? { bg: 'rgba(59, 130, 246, 0.22)', fg: '#93C5FD' }
      : { bg: '#DBEAFE', fg: '#1D4ED8' };
  }
  if (key.includes('not paid')) {
    return isDark
      ? { bg: 'rgba(245, 158, 11, 0.22)', fg: '#FCD34D' }
      : { bg: '#FEF3C7', fg: '#92400E' };
  }
  return isDark
    ? { bg: '#334155', fg: '#CBD5E1' }
    : { bg: '#E2E8F0', fg: '#475569' };
}

type Props = {
  detail: JournalEntryDetail | null;
  loading: boolean;
  error: string;
};

export function JournalEntryDetailView({ detail, loading, error }: Props) {
  const theme = useTheme();
  const isDark = theme.dark;
  const border = theme.colors.outlineVariant ?? theme.colors.outline;
  const muted = theme.colors.onSurfaceVariant;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12, color: muted }}>
          Loading journal entry…
        </Text>
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

  if (!detail) {
    return (
      <View style={styles.center}>
        <Text style={{ color: muted }}>Journal entry not found.</Text>
      </View>
    );
  }

  const stateColors = statusColors(detail.state, isDark);
  const payColors = paymentColors(detail.paymentStateLabel, isDark);
  const currency = detail.currency || 'MMK';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: border },
        ]}>
        <View style={styles.titleRow}>
          <Text variant="headlineSmall" style={styles.title}>
            {detail.number || 'Journal Entry'}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: stateColors.bg }]}>
              <Text style={[styles.badgeText, { color: stateColors.fg }]}>
                {detail.statusLabel || '—'}
              </Text>
            </View>
            {detail.paymentStateLabel ? (
              <View style={[styles.badge, { backgroundColor: payColors.bg }]}>
                <Text style={[styles.badgeText, { color: payColors.fg }]}>
                  {detail.paymentStateLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.metaGrid}>
          <Meta label="Partner" muted={muted}>
            <CustomerNameText>{detail.partner || '—'}</CustomerNameText>
          </Meta>
          <Meta
            label="Journal"
            value={detail.journal || '—'}
            muted={muted}
          />
          <Meta
            label="Date"
            value={formatMyanmarDate(detail.date) || detail.date || '—'}
            muted={muted}
          />
          <Meta
            label="Invoice Date"
            value={
              formatMyanmarDate(detail.invoiceDate) ||
              detail.invoiceDate ||
              '—'
            }
            muted={muted}
          />
          <Meta
            label="Due Date"
            value={formatMyanmarDate(detail.dueDate) || detail.dueDate || '—'}
            muted={muted}
          />
          <Meta
            label="Reference"
            value={detail.reference || detail.origin || '—'}
            muted={muted}
          />
          <Meta
            label="Total"
            value={formatMoney(detail.amountTotal, currency)}
            muted={muted}
          />
          <Meta
            label="Amount Due"
            value={formatMoney(detail.amountDue, currency)}
            muted={muted}
          />
        </View>
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: border },
        ]}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Journal Items
        </Text>

        <View style={[styles.tableHeader, { backgroundColor: theme.colors.primary }]}>
          <Text
            style={[styles.th, styles.colAccount, { color: theme.colors.onPrimary }]}>
            Account
          </Text>
          <Text
            style={[styles.th, styles.colLabel, { color: theme.colors.onPrimary }]}>
            Label
          </Text>
          <Text
            style={[styles.th, styles.colAmount, { color: theme.colors.onPrimary }]}>
            Debit
          </Text>
          <Text
            style={[styles.th, styles.colAmount, { color: theme.colors.onPrimary }]}>
            Credit
          </Text>
          <Text
            style={[styles.th, styles.colTax, { color: theme.colors.onPrimary }]}>
            Tax Grids
          </Text>
        </View>

        {detail.lines.length === 0 ? (
          <Text style={{ color: muted, paddingVertical: 12 }}>
            No journal items.
          </Text>
        ) : (
          detail.lines.map((line, index) => {
            const zebra = index % 2 === 1;
            return (
              <View
                key={line.id}
                style={[
                  styles.tableRow,
                  {
                    borderBottomColor: border,
                    backgroundColor: zebra
                      ? theme.colors.surfaceVariant
                      : theme.colors.surface,
                  },
                ]}>
                <Text
                  style={[
                    styles.colAccount,
                    styles.cellText,
                    { color: theme.colors.onSurface, fontWeight: '600' },
                  ]}
                  numberOfLines={2}>
                  {line.account || '—'}
                </Text>
                <Text
                  style={[
                    styles.colLabel,
                    styles.cellText,
                    { color: theme.colors.onSurface },
                  ]}
                  numberOfLines={3}>
                  {line.label || '—'}
                </Text>
                <Text
                  style={[
                    styles.colAmount,
                    styles.cellText,
                    styles.alignRight,
                    { color: theme.colors.onSurface },
                  ]}>
                  {line.debit ? formatMoney(line.debit) : ''}
                </Text>
                <Text
                  style={[
                    styles.colAmount,
                    styles.cellText,
                    styles.alignRight,
                    { color: theme.colors.onSurface },
                  ]}>
                  {line.credit ? formatMoney(line.credit) : ''}
                </Text>
                <Text
                  style={[
                    styles.colTax,
                    styles.cellText,
                    { color: muted },
                  ]}
                  numberOfLines={2}>
                  {line.taxGrids || ''}
                </Text>
              </View>
            );
          })
        )}

        <View
          style={[
            styles.totalsRow,
            {
              borderTopColor: border,
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}>
          <Text
            style={[
              styles.colAccount,
              styles.cellText,
              styles.bold,
              { color: theme.colors.onSurface },
            ]}>
            Total
          </Text>
          <View style={styles.colLabel} />
          <Text
            style={[
              styles.colAmount,
              styles.cellText,
              styles.alignRight,
              styles.bold,
              { color: theme.colors.onSurface },
            ]}>
            {formatMoney(detail.debitTotal, currency)}
          </Text>
          <Text
            style={[
              styles.colAmount,
              styles.cellText,
              styles.alignRight,
              styles.bold,
              { color: theme.colors.onSurface },
            ]}>
            {formatMoney(detail.creditTotal, currency)}
          </Text>
          <View style={styles.colTax} />
        </View>
      </View>
    </ScrollView>
  );
}

function Meta({
  label,
  value,
  muted,
  children,
}: {
  label: string;
  value?: string;
  muted: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.metaItem}>
      <Text style={[styles.metaLabel, { color: muted }]}>{label}</Text>
      {children ?? (
        <Text style={{ color: theme.colors.onSurface, fontSize: 14 }}>
          {value}
        </Text>
      )}
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
    borderRadius: 12,
    padding: 16,
    gap: 12,
    overflow: 'hidden',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontWeight: '700',
    minWidth: 0,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    width: '47%',
    minWidth: 140,
    gap: 2,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    borderRadius: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  th: {
    fontSize: 12,
    fontWeight: '700',
  },
  cellText: {
    fontSize: 13,
  },
  colAccount: { flex: 1.6, minWidth: 0 },
  colLabel: { flex: 1.8, minWidth: 0 },
  colAmount: { flex: 1.1, minWidth: 0 },
  colTax: { flex: 1, minWidth: 0 },
  alignRight: { textAlign: 'right' },
  bold: { fontWeight: '700' },
});
