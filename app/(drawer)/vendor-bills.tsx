/**
 * Vendor Bills — Odoo account.move (move_type=in_invoice).
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
import { fetchVendorBills } from '@/services/vendor-bills';
import {
  VendorBill,
  VendorBillStatusFilter,
} from '@/types/vendor-bill';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

const PAGE_SIZE = 50;
const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];

const STATUS_FILTERS: { key: VendorBillStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'not_paid', label: 'Not Paid' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancel', label: 'Cancelled' },
];

const COLUMNS = [
  { key: 'number', label: 'Number', flex: 1.4 },
  { key: 'vendor', label: 'Vendor', flex: 1.8 },
  { key: 'billDate', label: 'Bill Date', flex: 1.1 },
  { key: 'dueDate', label: 'Due Date', flex: 1.1 },
  { key: 'reference', label: 'Reference', flex: 1.2 },
  {
    key: 'amountUntaxed',
    label: 'Tax Excluded',
    flex: 1.2,
    align: 'right' as const,
  },
  { key: 'amountTotal', label: 'Total', flex: 1.2, align: 'right' as const },
  { key: 'amountDue', label: 'Amount Due', flex: 1.2, align: 'right' as const },
  { key: 'status', label: 'Status', flex: 1.1 },
];

function formatMoney(value: number, currency = 'MMK'): string {
  const safe = Number.isFinite(value) ? value : 0;
  const amount = safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount} ${currency || 'MMK'}`;
}

function getBillStatusColors(
  mode: ThemeMode,
  statusLabel: string,
  state: string,
  paymentState: string,
): { label: string; bg: string; fg: string } {
  const label = statusLabel.trim() || '—';
  const key = `${state} ${paymentState} ${label}`.toLowerCase();

  if (mode === 'dark') {
    if (key.includes('paid') && !key.includes('not') && !key.includes('partial')) {
      return { label, bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' };
    }
    if (key.includes('cancel')) {
      return { label, bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' };
    }
    if (key.includes('draft')) {
      return { label, bg: 'rgba(245, 158, 11, 0.22)', fg: '#FCD34D' };
    }
    if (key.includes('partial') || key.includes('in payment')) {
      return { label, bg: 'rgba(59, 130, 246, 0.22)', fg: '#93C5FD' };
    }
    return { label, bg: '#334155', fg: '#CBD5E1' };
  }

  if (key.includes('paid') && !key.includes('not') && !key.includes('partial')) {
    return { label, bg: '#DCFCE7', fg: '#166534' };
  }
  if (key.includes('cancel')) {
    return { label, bg: '#FEE2E2', fg: '#991B1B' };
  }
  if (key.includes('draft')) {
    return { label, bg: '#FEF3C7', fg: '#92400E' };
  }
  if (key.includes('partial') || key.includes('in payment')) {
    return { label, bg: '#DBEAFE', fg: '#1D4ED8' };
  }
  return { label, bg: '#E2E8F0', fg: '#475569' };
}

function StatusBadge({
  statusLabel,
  state,
  paymentState,
}: {
  statusLabel: string;
  state: string;
  paymentState: string;
}) {
  const { mode } = useAppTheme();
  const { label, bg, fg } = getBillStatusColors(
    mode,
    statusLabel,
    state,
    paymentState,
  );
  if (!statusLabel) {
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

export default function VendorBillsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const query = useModuleSearch('Search bills by number, vendor, or reference');
  useHeaderActions(EMPTY_HEADER_ACTIONS);

  const [statusFilter, setStatusFilter] =
    useState<VendorBillStatusFilter>('all');
  const [rows, setRows] = useState<VendorBill[]>([]);
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
        const data = await fetchVendorBills(session.token, {
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
              : 'Failed to load vendor bills.',
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
    if (isDesktop) return COLUMNS;
    return COLUMNS.filter(col =>
      ['number', 'vendor', 'amountTotal', 'amountDue', 'status'].includes(
        col.key,
      ),
    );
  }, [isDesktop]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const totalDue = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.amountDue) || 0), 0),
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
            Vendor Bills
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {rows.length} bill{rows.length === 1 ? '' : 's'} · from Odoo
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
            Due {formatMoney(totalDue)}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.statusBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor:
              theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusScroll}
          contentContainerStyle={styles.statusRow}>
          {STATUS_FILTERS.map(item => {
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
      </View>

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
            source="receipt-text-outline"
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
              ? 'No matching vendor bills'
              : 'No vendor bills'}
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
                    if (col.key === 'vendor') {
                      return (
                        <View
                          key={col.key}
                          style={[styles.cell, { flex: col.flex }]}>
                          <CustomerNameText numberOfLines={1}>
                            {row.vendor || '—'}
                          </CustomerNameText>
                        </View>
                      );
                    }
                    if (col.key === 'status') {
                      return (
                        <View
                          key={col.key}
                          style={[styles.cell, { flex: col.flex }]}>
                          <StatusBadge
                            statusLabel={row.statusLabel}
                            state={row.state}
                            paymentState={row.paymentState}
                          />
                        </View>
                      );
                    }
                    let text = '—';
                    switch (col.key) {
                      case 'number':
                        text = row.number || '—';
                        break;
                      case 'billDate':
                        text =
                          formatMyanmarDate(row.billDate) ||
                          row.billDate ||
                          '—';
                        break;
                      case 'dueDate':
                        text =
                          formatMyanmarDate(row.dueDate) || row.dueDate || '—';
                        break;
                      case 'reference':
                        text = row.reference || '—';
                        break;
                      case 'amountUntaxed':
                        text = formatMoney(row.amountUntaxed, row.currency);
                        break;
                      case 'amountTotal':
                        text = formatMoney(row.amountTotal, row.currency);
                        break;
                      case 'amountDue':
                        text = formatMoney(row.amountDue, row.currency);
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
                          col.key === 'number' ? styles.bold : null,
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
        itemLabel="bill"
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
  statusBar: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusScroll: {
    flexGrow: 0,
    maxHeight: 52,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 0,
  },
  statusChip: {
    borderRadius: 16,
    height: 32,
    alignSelf: 'center',
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
