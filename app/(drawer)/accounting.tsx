/**
 * Accounting module — section dropdown (Customer Invoices, Vendor Bills,
 * Payments, Monthly Rebate Review). Rebate list loads from Odoo; other
 * sections remain UI shells until wired.
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
import { DropdownField } from '@/components/ui/DropdownField';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/contexts/theme-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleFilters,
  useModuleSearch,
  useSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchMonthlyRebateReviews } from '@/services/monthly-rebate-reviews';
import {
  MONTHLY_REBATE_STATUSES,
  MonthlyRebateReview,
} from '@/types/monthly-rebate-review';
import { ThemeMode } from '@/constants/colors';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

type AccountingSection =
  | 'invoices'
  | 'bills'
  | 'payments'
  | 'monthly-rebate';

type InvoiceStatusFilter = 'all' | 'draft' | 'posted' | 'not_paid' | 'paid';

const SECTION_OPTIONS: { key: AccountingSection; label: string }[] = [
  { key: 'invoices', label: 'Customer Invoices' },
  { key: 'bills', label: 'Vendor Bills' },
  { key: 'payments', label: 'Payments' },
  { key: 'monthly-rebate', label: 'Monthly Rebate Review' },
];

const INVOICE_STATUS_FILTERS: { key: InvoiceStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'posted', label: 'Posted' },
  { key: 'not_paid', label: 'Not Paid' },
  { key: 'paid', label: 'Paid' },
];

const REBATE_STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  ...MONTHLY_REBATE_STATUSES.map(status => ({ key: status, label: status })),
];

const INVOICE_COLUMNS = [
  { key: 'number', label: 'Number', flex: 1.2 },
  { key: 'partner', label: 'Customer', flex: 1.6 },
  { key: 'date', label: 'Invoice Date', flex: 1.2 },
  { key: 'due', label: 'Due Date', flex: 1.2 },
  { key: 'total', label: 'Total', flex: 1.1, align: 'right' as const },
  { key: 'residual', label: 'Amount Due', flex: 1.1, align: 'right' as const },
  { key: 'status', label: 'Status', flex: 1 },
  { key: 'payment', label: 'Payment', flex: 1 },
];

const BILL_COLUMNS = [
  { key: 'number', label: 'Number', flex: 1.2 },
  { key: 'partner', label: 'Vendor', flex: 1.6 },
  { key: 'date', label: 'Bill Date', flex: 1.2 },
  { key: 'due', label: 'Due Date', flex: 1.2 },
  { key: 'total', label: 'Total', flex: 1.1, align: 'right' as const },
  { key: 'residual', label: 'Amount Due', flex: 1.1, align: 'right' as const },
  { key: 'status', label: 'Status', flex: 1 },
  { key: 'payment', label: 'Payment', flex: 1 },
];

const PAYMENT_COLUMNS = [
  { key: 'number', label: 'Number', flex: 1.2 },
  { key: 'partner', label: 'Partner', flex: 1.6 },
  { key: 'date', label: 'Date', flex: 1.2 },
  { key: 'journal', label: 'Journal', flex: 1.3 },
  { key: 'amount', label: 'Amount', flex: 1.1, align: 'right' as const },
  { key: 'type', label: 'Type', flex: 1 },
  { key: 'status', label: 'Status', flex: 1 },
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

const PAGE_SIZE = 50;
const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];

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

export default function AccountingScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const { setFiltersExpanded } = useSearch();

  const [section, setSection] = useState<AccountingSection>('monthly-rebate');
  const [invoiceStatusFilter, setInvoiceStatusFilter] =
    useState<InvoiceStatusFilter>('all');
  const [rebateStatusFilter, setRebateStatusFilter] = useState('all');

  const [rebateRows, setRebateRows] = useState<MonthlyRebateReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const hasLoadedRebateRef = useRef(false);

  const sectionLabel =
    SECTION_OPTIONS.find(item => item.key === section)?.label ??
    'Customer Invoices';

  const searchPlaceholder = useMemo(() => {
    switch (section) {
      case 'bills':
        return 'Search vendor bills by number or vendor';
      case 'payments':
        return 'Search payments by number or partner';
      case 'monthly-rebate':
        return 'Search rebate by reference, customer, or status';
      default:
        return 'Search customer invoices by number or customer';
    }
  }, [section]);

  const query = useModuleSearch(searchPlaceholder);
  useHeaderActions(EMPTY_HEADER_ACTIONS);

  useEffect(() => {
    setFiltersExpanded(true);
    return () => setFiltersExpanded(false);
  }, [setFiltersExpanded]);

  const loadRebates = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!session?.token || section !== 'monthly-rebate') {
        return;
      }
      const soft = Boolean(opts?.soft) || hasLoadedRebateRef.current;
      if (!soft) setLoading(true);
      if (!soft) setError('');
      try {
        const rows = await fetchMonthlyRebateReviews(session.token, {
          q: query.trim() || undefined,
          status:
            rebateStatusFilter === 'all' ? undefined : rebateStatusFilter,
          limit: 500,
          offset: 0,
        });
        setRebateRows(rows);
        setPage(1);
        hasLoadedRebateRef.current = true;
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
    [session?.token, section, query, rebateStatusFilter],
  );

  useEffect(() => {
    if (section === 'monthly-rebate') {
      void loadRebates();
    } else {
      setLoading(false);
      setRefreshing(false);
      setError('');
    }
  }, [section, loadRebates]);

  const onRefresh = useCallback(() => {
    if (section !== 'monthly-rebate') return;
    setRefreshing(true);
    void loadRebates({ soft: true });
  }, [section, loadRebates]);

  const onChangeSection = useCallback((label: string) => {
    const next =
      SECTION_OPTIONS.find(item => item.label === label)?.key ?? 'invoices';
    setSection(next);
    setInvoiceStatusFilter('all');
    setRebateStatusFilter('all');
    setPage(1);
  }, []);

  const filterPanel = useMemo(
    () => (
      <View style={styles.headerFilterPanel}>
        <View style={styles.filterField}>
          <DropdownField
            compact
            variant="header"
            placeholder="Section"
            value={sectionLabel}
            options={SECTION_OPTIONS.map(item => item.label)}
            onChange={onChangeSection}
            sortOptions={false}
            showClearOption={false}
          />
        </View>
      </View>
    ),
    [sectionLabel, onChangeSection],
  );
  useModuleFilters(filterPanel);

  const shellColumns = useMemo(() => {
    if (section === 'bills') return BILL_COLUMNS;
    if (section === 'payments') return PAYMENT_COLUMNS;
    return INVOICE_COLUMNS;
  }, [section]);

  const visibleShellColumns = useMemo(() => {
    if (isDesktop) return shellColumns;
    return shellColumns.filter(col =>
      ['number', 'partner', 'total', 'amount', 'status', 'payment'].includes(
        col.key,
      ),
    );
  }, [shellColumns, isDesktop]);

  const visibleRebateColumns = useMemo(() => {
    if (isDesktop) return REBATE_COLUMNS;
    return REBATE_COLUMNS.filter(col =>
      ['reference', 'customer', 'rebateAmount', 'status'].includes(col.key),
    );
  }, [isDesktop]);

  const pageCount = Math.max(1, Math.ceil(rebateRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedRebates = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rebateRows.slice(start, start + PAGE_SIZE);
  }, [rebateRows, safePage]);

  const rebateTotal = useMemo(
    () =>
      rebateRows.reduce(
        (sum, row) => sum + (Number(row.rebateAmount) || 0),
        0,
      ),
    [rebateRows],
  );

  const shellEmpty = useMemo(() => {
    switch (section) {
      case 'bills':
        return {
          title: 'No vendor bills yet',
          body: 'Vendor bills from Odoo will appear here. UI only for now.',
        };
      case 'payments':
        return {
          title: 'No payments yet',
          body: 'Payments from Odoo will appear here. UI only for now.',
        };
      default:
        return {
          title: 'No customer invoices yet',
          body: 'Customer invoices from Odoo will appear here. UI only for now.',
        };
    }
  }, [section]);

  const refreshControl =
    section === 'monthly-rebate' ? (
      <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
    ) : undefined;

  if (section === 'monthly-rebate' && loading && !hasLoadedRebateRef.current) {
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
            borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <View style={styles.summaryCopy}>
          <Text variant="titleSmall" style={{ fontWeight: '700' }}>
            {sectionLabel}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {section === 'monthly-rebate'
              ? `${rebateRows.length} record${rebateRows.length === 1 ? '' : 's'} · Odoo Monthly Rebate Review`
              : 'UI shell — select Monthly Rebate Review for live Odoo data'}
          </Text>
        </View>
        {section === 'monthly-rebate' ? (
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
        ) : null}
      </View>

      {section === 'monthly-rebate' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusRow}>
          {REBATE_STATUS_FILTERS.map(item => {
            const selected = rebateStatusFilter === item.key;
            return (
              <Chip
                key={item.key}
                compact
                selected={selected}
                onPress={() => setRebateStatusFilter(item.key)}
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
      ) : section !== 'payments' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusRow}>
          {INVOICE_STATUS_FILTERS.map(item => {
            const selected = invoiceStatusFilter === item.key;
            return (
              <Chip
                key={item.key}
                compact
                selected={selected}
                onPress={() => setInvoiceStatusFilter(item.key)}
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
      ) : null}

      {section === 'monthly-rebate' ? (
        error ? (
          <View style={styles.center}>
            <Text style={{ color: theme.colors.error, textAlign: 'center' }}>
              {error}
            </Text>
          </View>
        ) : pagedRebates.length === 0 ? (
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
              {query.trim() || rebateStatusFilter !== 'all'
                ? 'No matching rebate reviews'
                : 'No monthly rebate reviews'}
            </Text>
            <Text
              variant="bodyMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                textAlign: 'center',
                maxWidth: 420,
                marginTop: 4,
              }}>
              Records come from Odoo model x_monthly_rebate_revie.
            </Text>
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            <View
              style={[
                styles.headerRow,
                { backgroundColor: theme.colors.primary },
              ]}>
              {visibleRebateColumns.map(col => (
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
              {pagedRebates.map((row, index) => {
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
                    {visibleRebateColumns.map(col => {
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
                          text =
                            formatMyanmarDate(row.month) || row.month || '—';
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
        )
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.shellScroll}>
          <View
            style={[
              styles.tableWrap,
              {
                borderColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
                backgroundColor: theme.colors.surface,
              },
            ]}>
            <View
              style={[
                styles.headerRow,
                { backgroundColor: theme.colors.primary },
              ]}>
              {visibleShellColumns.map(col => (
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
            <View style={styles.emptyBlock}>
              <Icon
                source="book-open-page-variant-outline"
                size={40}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="titleMedium"
                style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
                {shellEmpty.title}
              </Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: theme.colors.onSurfaceVariant,
                  textAlign: 'center',
                  maxWidth: 420,
                }}>
                {shellEmpty.body}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

      <Pagination
        page={section === 'monthly-rebate' ? safePage : 1}
        pageCount={section === 'monthly-rebate' ? pageCount : 1}
        total={section === 'monthly-rebate' ? rebateRows.length : 0}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        centerLabel={
          section === 'monthly-rebate'
            ? `${rebateRows.length} from Odoo`
            : 'Accounting'
        }
        itemLabel={
          section === 'monthly-rebate'
            ? 'rebate'
            : section === 'bills'
              ? 'bill'
              : section === 'payments'
                ? 'payment'
                : 'invoice'
        }
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
  headerFilterPanel: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    alignItems: 'center',
  },
  filterField: {
    minWidth: 220,
    maxWidth: 320,
    width: '100%',
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
  shellScroll: {
    padding: 16,
    paddingBottom: 24,
  },
  tableWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 280,
  },
  emptyBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
});
