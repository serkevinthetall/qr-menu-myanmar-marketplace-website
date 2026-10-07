/**
 * Customer Invoices — Odoo account.move (out_invoice), grouped by month.
 * Nested under Accounting in the drawer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Chip, Icon, Text, useTheme } from 'react-native-paper';

import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { ThemeMode } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
} from '@/contexts/search-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchCustomerInvoiceMonths,
  fetchCustomerInvoices,
} from '@/services/customer-invoices';
import {
  CustomerInvoice,
  CustomerInvoiceMonthGroup,
  CustomerInvoiceMonthTotals,
  CustomerInvoiceStatusFilter,
} from '@/types/customer-invoice';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];
const EMPTY_TOTALS: CustomerInvoiceMonthTotals = {
  count: 0,
  amountUntaxed: 0,
  amountTotal: 0,
  amountDue: 0,
  currency: 'MMK',
};

const STATUS_FILTERS: { key: CustomerInvoiceStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'not_paid', label: 'Not Paid' },
  { key: 'paid', label: 'Paid' },
  { key: 'cancel', label: 'Cancelled' },
];

const COLUMNS = [
  { key: 'number', label: 'Number', flex: 1.3 },
  { key: 'reference', label: 'Reference', flex: 1.1 },
  { key: 'customer', label: 'Customer', flex: 1.6 },
  { key: 'invoiceDate', label: 'Invoice Date', flex: 1.1 },
  { key: 'dueDate', label: 'Due Date', flex: 1.1 },
  {
    key: 'amountUntaxed',
    label: 'Tax Excluded',
    flex: 1.3,
    align: 'right' as const,
  },
  { key: 'amountTotal', label: 'Total', flex: 1.3, align: 'right' as const },
  { key: 'amountDue', label: 'Amount Due', flex: 1.3, align: 'right' as const },
  { key: 'status', label: 'Status', flex: 1.1 },
  { key: 'count', label: 'Count', flex: 0.7, align: 'right' as const },
];

function formatMoney(value: number, currency = 'MMK'): string {
  const safe = Number.isFinite(value) ? value : 0;
  const amount = safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount} ${currency || 'MMK'}`;
}

function getInvoiceStatusColors(
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
  const { label, bg, fg } = getInvoiceStatusColors(
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

export default function CustomerInvoicesScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const query = useModuleSearch(
    'Search invoices by number, customer, or reference',
  );
  useHeaderActions(EMPTY_HEADER_ACTIONS);

  const [statusFilter, setStatusFilter] =
    useState<CustomerInvoiceStatusFilter>('all');
  const [months, setMonths] = useState<CustomerInvoiceMonthGroup[]>([]);
  const [totals, setTotals] = useState<CustomerInvoiceMonthTotals>(EMPTY_TOTALS);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [monthInvoices, setMonthInvoices] = useState<
    Record<string, CustomerInvoice[]>
  >({});
  const [loadingMonths, setLoadingMonths] = useState<Record<string, boolean>>(
    {},
  );
  const [searchRows, setSearchRows] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const hasLoadedOnceRef = useRef(false);
  const isSearch = query.trim().length > 0;

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
        const status = statusFilter === 'all' ? undefined : statusFilter;
        if (query.trim()) {
          const data = await fetchCustomerInvoices(session.token, {
            q: query.trim(),
            status,
            limit: 200,
            offset: 0,
          });
          setSearchRows(data);
          setMonths([]);
          setTotals(EMPTY_TOTALS);
          setExpandedKeys(new Set());
          setMonthInvoices({});
        } else {
          const result = await fetchCustomerInvoiceMonths(session.token, {
            status,
          });
          setMonths(result.months);
          setTotals(result.totals);
          setSearchRows([]);
          setExpandedKeys(new Set());
          setMonthInvoices({});
        }
        hasLoadedOnceRef.current = true;
      } catch (err) {
        if (!soft) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load customer invoices.',
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

  const loadMonthInvoices = useCallback(
    async (monthKey: string) => {
      if (!session?.token || monthInvoices[monthKey]) return;
      setLoadingMonths(prev => ({ ...prev, [monthKey]: true }));
      try {
        const data = await fetchCustomerInvoices(session.token, {
          month: monthKey,
          status: statusFilter === 'all' ? undefined : statusFilter,
          limit: 500,
          offset: 0,
        });
        setMonthInvoices(prev => ({ ...prev, [monthKey]: data }));
      } catch {
        setMonthInvoices(prev => ({ ...prev, [monthKey]: [] }));
      } finally {
        setLoadingMonths(prev => ({ ...prev, [monthKey]: false }));
      }
    },
    [session?.token, monthInvoices, statusFilter],
  );

  const toggleMonth = useCallback(
    (monthKey: string) => {
      setExpandedKeys(prev => {
        const next = new Set(prev);
        if (next.has(monthKey)) {
          next.delete(monthKey);
        } else {
          next.add(monthKey);
          void loadMonthInvoices(monthKey);
        }
        return next;
      });
    },
    [loadMonthInvoices],
  );

  const visibleColumns = useMemo(() => {
    if (isDesktop) return COLUMNS;
    return COLUMNS.filter(col =>
      ['number', 'customer', 'amountTotal', 'amountDue', 'count'].includes(
        col.key,
      ),
    );
  }, [isDesktop]);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  if (loading && !hasLoadedOnceRef.current) {
    return <ListSkeleton variant="invoices" />;
  }

  const renderInvoiceRow = (row: CustomerInvoice, index: number) => {
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
              <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
                <CustomerNameText numberOfLines={1}>
                  {row.customer || '—'}
                </CustomerNameText>
              </View>
            );
          }
          if (col.key === 'status') {
            return (
              <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
                <StatusBadge
                  statusLabel={row.statusLabel}
                  state={row.state}
                  paymentState={row.paymentState}
                />
              </View>
            );
          }
          if (col.key === 'count') {
            return (
              <Text
                key={col.key}
                style={[
                  styles.cellText,
                  styles.alignRight,
                  { flex: col.flex, color: theme.colors.onSurfaceVariant },
                ]}>
                —
              </Text>
            );
          }
          let text = '—';
          switch (col.key) {
            case 'number':
              text = row.number || '—';
              break;
            case 'reference':
              text = row.reference || row.origin || '—';
              break;
            case 'invoiceDate':
              text =
                formatMyanmarDate(row.invoiceDate) || row.invoiceDate || '—';
              break;
            case 'dueDate':
              text = formatMyanmarDate(row.dueDate) || row.dueDate || '—';
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
  };

  const renderMonthRow = (month: CustomerInvoiceMonthGroup) => {
    const expanded = expandedKeys.has(month.key);
    const invoices = monthInvoices[month.key] ?? [];
    const monthLoading = Boolean(loadingMonths[month.key]);

    return (
      <View key={month.key}>
        <Pressable
          onPress={() => toggleMonth(month.key)}
          style={({ hovered, pressed }) => [
            styles.monthRow,
            {
              backgroundColor:
                hovered || pressed
                  ? theme.colors.secondaryContainer
                  : theme.colors.surfaceVariant,
              borderBottomColor:
                theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          {visibleColumns.map(col => {
            if (col.key === 'number') {
              return (
                <View
                  key={col.key}
                  style={[styles.monthLabelCell, { flex: col.flex }]}>
                  <Icon
                    source={expanded ? 'chevron-down' : 'chevron-right'}
                    size={18}
                    color={theme.colors.onSurface}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.cellText,
                      styles.bold,
                      { color: theme.colors.onSurface, flex: 1 },
                    ]}>
                    {month.label}
                  </Text>
                </View>
              );
            }
            if (col.key === 'count') {
              return (
                <Text
                  key={col.key}
                  numberOfLines={1}
                  style={[
                    styles.cellText,
                    styles.bold,
                    styles.alignRight,
                    { flex: col.flex, color: theme.colors.onSurface },
                  ]}>
                  {month.count.toLocaleString('en-US')}
                </Text>
              );
            }
            if (
              col.key === 'amountUntaxed' ||
              col.key === 'amountTotal' ||
              col.key === 'amountDue'
            ) {
              const value =
                col.key === 'amountUntaxed'
                  ? month.amountUntaxed
                  : col.key === 'amountTotal'
                    ? month.amountTotal
                    : month.amountDue;
              return (
                <Text
                  key={col.key}
                  numberOfLines={1}
                  style={[
                    styles.cellText,
                    styles.bold,
                    styles.alignRight,
                    { flex: col.flex, color: theme.colors.onSurface },
                  ]}>
                  {formatMoney(value, month.currency)}
                </Text>
              );
            }
            return (
              <View key={col.key} style={{ flex: col.flex }} />
            );
          })}
        </Pressable>
        {expanded ? (
          monthLoading ? (
            <View style={styles.monthLoading}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : invoices.length === 0 ? (
            <View style={styles.monthEmpty}>
              <Text
                style={{
                  color: theme.colors.onSurfaceVariant,
                  fontSize: 13,
                }}>
                No invoices in this month
              </Text>
            </View>
          ) : (
            invoices.map((row, index) => renderInvoiceRow(row, index))
          )
        ) : null}
      </View>
    );
  };

  const empty = isSearch ? searchRows.length === 0 : months.length === 0;

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
            Customer Invoices
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {isSearch
              ? `${searchRows.length} match${searchRows.length === 1 ? '' : 'es'} · from Odoo`
              : `${totals.count.toLocaleString('en-US')} invoice${totals.count === 1 ? '' : 's'} · by month`}
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
            Due{' '}
            {formatMoney(
              isSearch
                ? searchRows.reduce(
                    (sum, row) => sum + (Number(row.amountDue) || 0),
                    0,
                  )
                : totals.amountDue,
              totals.currency,
            )}
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
      ) : empty ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.emptyWrap}
          refreshControl={refreshControl}>
          <Icon
            source="file-document-outline"
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
              ? 'No matching customer invoices'
              : 'No customer invoices'}
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
            {isSearch
              ? searchRows.map((row, index) => renderInvoiceRow(row, index))
              : months.map(month => renderMonthRow(month))}
          </ScrollView>
          {!isSearch ? (
            <View
              style={[
                styles.footerRow,
                {
                  backgroundColor: theme.colors.surface,
                  borderTopColor:
                    theme.colors.outlineVariant ?? theme.colors.outline,
                },
              ]}>
              {visibleColumns.map(col => {
                if (col.key === 'number') {
                  return (
                    <Text
                      key={col.key}
                      numberOfLines={1}
                      style={[
                        styles.cellText,
                        styles.bold,
                        { flex: col.flex, color: theme.colors.onSurface },
                      ]}>
                      Total
                    </Text>
                  );
                }
                if (col.key === 'count') {
                  return (
                    <Text
                      key={col.key}
                      numberOfLines={1}
                      style={[
                        styles.cellText,
                        styles.bold,
                        styles.alignRight,
                        { flex: col.flex, color: theme.colors.onSurface },
                      ]}>
                      {totals.count.toLocaleString('en-US')}
                    </Text>
                  );
                }
                if (
                  col.key === 'amountUntaxed' ||
                  col.key === 'amountTotal' ||
                  col.key === 'amountDue'
                ) {
                  const value =
                    col.key === 'amountUntaxed'
                      ? totals.amountUntaxed
                      : col.key === 'amountTotal'
                        ? totals.amountTotal
                        : totals.amountDue;
                  return (
                    <Text
                      key={col.key}
                      numberOfLines={1}
                      style={[
                        styles.cellText,
                        styles.bold,
                        styles.alignRight,
                        { flex: col.flex, color: theme.colors.onSurface },
                      ]}>
                      {formatMoney(value, totals.currency)}
                    </Text>
                  );
                }
                return <View key={col.key} style={{ flex: col.flex }} />;
              })}
            </View>
          ) : null}
        </View>
      )}
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
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  monthLabelCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  monthLoading: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  monthEmpty: {
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    fontWeight: '700',
  },
  alignRight: {
    textAlign: 'right',
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
