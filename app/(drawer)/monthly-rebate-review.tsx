/**
 * Monthly Rebate Review — Odoo model x_monthly_rebate_revie.
 * Nested under Accounting in the drawer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Chip, Icon, Text, useTheme } from 'react-native-paper';

import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { Pagination } from '@/components/ui/Pagination';
import { ThemeMode } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
} from '@/contexts/search-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchMonthlyRebateReviews } from '@/services/monthly-rebate-reviews';
import {
  MONTHLY_REBATE_STATUSES,
  MonthlyRebateReview,
} from '@/types/monthly-rebate-review';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

const PAGE_SIZE = 50;
const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];

const REBATE_STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  ...MONTHLY_REBATE_STATUSES.map(status => ({ key: status, label: status })),
];

const REBATE_COLUMNS = [
  { key: 'displayName', label: 'Display Name', flex: 1.4 },
  { key: 'reference', label: 'Reference', flex: 1.2 },
  { key: 'customer', label: 'Customer', flex: 1.6 },
  { key: 'month', label: 'Month', flex: 1.1 },
  { key: 'rebateRate', label: 'Rebate Rate', flex: 1, align: 'right' as const },
  { key: 'paidSales', label: 'Paid Sales', flex: 1.2, align: 'right' as const },
  {
    key: 'rebateAmount',
    label: 'Rebate Amount',
    flex: 1.2,
    align: 'right' as const,
  },
  { key: 'status', label: 'Status', flex: 1.3 },
  { key: 'name', label: 'Name', flex: 1.2 },
];

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

function formatRate(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

function getRebateStatusColors(
  mode: ThemeMode,
  status: string,
): { label: string; bg: string; fg: string } {
  const value = status.trim().toLowerCase();
  const label = status.trim() || '—';

  if (mode === 'dark') {
    if (value === 'paid' || value === 'approved') {
      return { label, bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' };
    }
    if (value === 'rejected') {
      return { label, bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' };
    }
    if (value.includes('credit')) {
      return { label, bg: 'rgba(59, 130, 246, 0.22)', fg: '#93C5FD' };
    }
    if (value.includes('review')) {
      return { label, bg: 'rgba(245, 158, 11, 0.22)', fg: '#FCD34D' };
    }
    return { label, bg: '#334155', fg: '#CBD5E1' };
  }

  if (value === 'paid' || value === 'approved') {
    return { label, bg: '#DCFCE7', fg: '#166534' };
  }
  if (value === 'rejected') {
    return { label, bg: '#FEE2E2', fg: '#991B1B' };
  }
  if (value.includes('credit')) {
    return { label, bg: '#DBEAFE', fg: '#1D4ED8' };
  }
  if (value.includes('review')) {
    return { label, bg: '#FEF3C7', fg: '#92400E' };
  }
  return { label, bg: '#E2E8F0', fg: '#475569' };
}

function RebateStatusBadge({ status }: { status: string }) {
  const { mode } = useAppTheme();
  const { label, bg, fg } = getRebateStatusColors(mode, status);
  if (!status) {
    return <Text style={{ opacity: 0.5 }}>—</Text>;
  }
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text
        variant="labelSmall"
        numberOfLines={1}
        style={{ color: fg, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

export default function MonthlyRebateReviewScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const query = useModuleSearch(
    'Search rebate by reference, customer, or status',
  );
  useHeaderActions(EMPTY_HEADER_ACTIONS);

  const [statusFilter, setStatusFilter] = useState('all');
  const [rows, setRows] = useState<MonthlyRebateReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!session?.token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const soft = Boolean(opts?.soft) || hasLoadedOnceRef.current;
      if (!soft) setLoading(true);
      if (!soft) setError('');
      try {
        const data = await fetchMonthlyRebateReviews(session.token, {
          q: query.trim() || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          limit: 500,
          offset: 0,
        });
        setRows(data);
        setPage(1);
        hasLoadedOnceRef.current = true;
      } catch (err) {
        if (!soft) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load monthly rebate reviews.',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.token, query, statusFilter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ soft: true });
  }, [load]);

  const visibleColumns = useMemo(() => {
    if (isDesktop) return REBATE_COLUMNS;
    return REBATE_COLUMNS.filter(col =>
      ['reference', 'customer', 'rebateAmount', 'status'].includes(col.key),
    );
  }, [isDesktop]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const rebateTotal = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.rebateAmount) || 0), 0),
    [rows],
  );

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  if (loading && !hasLoadedOnceRef.current) {
    return <ListSkeleton variant="invoices" />;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.summaryBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor:
              theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <View style={styles.summaryCopy}>
          <Text variant="titleSmall" style={{ fontWeight: '700' }}>
            Monthly Rebate Review
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {rows.length} record{rows.length === 1 ? '' : 's'} · from Odoo
          </Text>
        </View>
        <View
          style={[
            styles.statChip,
            { backgroundColor: theme.colors.primaryContainer },
          ]}>
          <Text
            style={{
              color: theme.colors.onPrimaryContainer,
              fontWeight: '700',
              fontSize: 13,
            }}>
            {formatMoney(rebateTotal)}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusRow}>
        {REBATE_STATUS_FILTERS.map(item => {
          const selected = statusFilter === item.key;
          return (
            <Chip
              key={item.key}
              compact
              selected={selected}
              onPress={() => setStatusFilter(item.key)}
              style={[
                styles.statusChip,
                {
                  backgroundColor: selected
                    ? theme.colors.secondaryContainer
                    : theme.colors.surfaceVariant,
                },
              ]}
              textStyle={{
                color: selected
                  ? theme.colors.onSecondaryContainer
                  : theme.colors.onSurfaceVariant,
                fontWeight: '600',
                fontSize: 12,
              }}>
              {item.label}
            </Chip>
          );
        })}
      </ScrollView>

      {error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      ) : paged.length === 0 ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.emptyWrap}
          refreshControl={refreshControl}>
          <Icon
            source="cash-refund"
            size={40}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '700',
              marginTop: 8,
              textAlign: 'center',
            }}>
            {query.trim() || statusFilter !== 'all'
              ? 'No matching rebate reviews'
              : 'No monthly rebate reviews'}
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.flex}>
          <View
            style={[
              styles.headerRow,
              { backgroundColor: theme.colors.primary },
            ]}>
            {visibleColumns.map(col => (
              <Text
                key={col.key}
                numberOfLines={1}
                style={[
                  styles.th,
                  { flex: col.flex, color: theme.colors.onPrimary },
                  col.align === 'right' ? styles.alignRight : null,
                ]}>
                {col.label}
              </Text>
            ))}
          </View>
          <ScrollView style={styles.flex} refreshControl={refreshControl}>
            {paged.map((row, index) => {
              const zebra = index % 2 === 1;
              return (
                <Pressable
                  key={row.id}
                  style={({ hovered, pressed }) => [
                    styles.dataRow,
                    {
                      backgroundColor:
                        hovered || pressed
                          ? theme.colors.primaryContainer
                          : zebra
                            ? theme.colors.surfaceVariant
                            : theme.colors.surface,
                      borderBottomColor:
                        theme.colors.outlineVariant ?? theme.colors.outline,
                    },
                  ]}>
                  {visibleColumns.map(col => {
                    if (col.key === 'customer') {
                      return (
                        <View
                          key={col.key}
                          style={[styles.cell, { flex: col.flex }]}>
                          <CustomerNameText numberOfLines={1}>
                            {row.customer || '—'}
                          </CustomerNameText>
                        </View>
                      );
                    }
                    if (col.key === 'status') {
                      return (
                        <View
                          key={col.key}
                          style={[styles.cell, { flex: col.flex }]}>
                          <RebateStatusBadge status={row.status} />
                        </View>
                      );
                    }
                    let text = '—';
                    switch (col.key) {
                      case 'displayName':
                        text = row.displayName || '—';
                        break;
                      case 'reference':
                        text = row.reference || '—';
                        break;
                      case 'month':
                        text = formatMyanmarDate(row.month) || row.month || '—';
                        break;
                      case 'rebateRate':
                        text = formatRate(row.rebateRate);
                        break;
                      case 'paidSales':
                        text = formatMoney(row.paidSales);
                        break;
                      case 'rebateAmount':
                        text = formatMoney(row.rebateAmount);
                        break;
                      case 'name':
                        text = row.name || '—';
                        break;
                      default:
                        break;
                    }
                    return (
                      <Text
                        key={col.key}
                        numberOfLines={1}
                        style={[
                          styles.cellText,
                          { flex: col.flex, color: theme.colors.onSurface },
                          col.align === 'right' ? styles.alignRight : null,
                          col.key === 'reference' ? styles.bold : null,
                        ]}>
                        {text}
                      </Text>
                    );
                  })}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={rows.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        centerLabel={`${rows.length} from Odoo`}
        itemLabel="rebate"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  statChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusChip: {
    borderRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  th: {
    fontSize: 12,
    fontWeight: '700',
  },
  alignRight: {
    textAlign: 'right',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    justifyContent: 'center',
    minWidth: 0,
  },
  cellText: {
    fontSize: 13,
    minWidth: 0,
  },
  bold: {
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
