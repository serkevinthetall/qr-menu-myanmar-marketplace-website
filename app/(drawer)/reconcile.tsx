/**
 * Journal Items to Reconcile — Odoo account.move.line with residual.
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
import { Icon, Text, useTheme } from 'react-native-paper';

import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchReconcileItems } from '@/services/reconcile';
import { ReconcileItem } from '@/types/reconcile-item';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

const PAGE_SIZE = 50;
const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];

const COLUMNS = [
  { key: 'date', label: 'Date', flex: 1 },
  { key: 'name', label: 'Name', flex: 1.3 },
  { key: 'journalEntry', label: 'Journal Entry', flex: 1.3 },
  { key: 'partner', label: 'Partner', flex: 1.5 },
  { key: 'reference', label: 'Reference', flex: 1.1 },
  { key: 'debit', label: 'Debit', flex: 1.1, align: 'right' as const },
  { key: 'credit', label: 'Credit', flex: 1.1, align: 'right' as const },
  { key: 'residual', label: 'Residual', flex: 1.2, align: 'right' as const },
];

function formatMoney(value: number, currency = 'MMK'): string {
  const safe = Number.isFinite(value) ? value : 0;
  const amount = safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount} ${currency || 'MMK'}`;
}

type ListRow =
  | { type: 'account'; key: string; label: string }
  | { type: 'partner'; key: string; label: string; count: number }
  | { type: 'item'; key: string; item: ReconcileItem };

function buildGroupedRows(items: ReconcileItem[]): ListRow[] {
  const rows: ListRow[] = [];
  let lastAccount = '';
  let lastPartner = '';

  for (const item of items) {
    const account = item.account?.trim() || 'Unassigned account';
    const partner = item.partner?.trim() || 'No partner';
    if (account !== lastAccount) {
      rows.push({
        type: 'account',
        key: `account-${item.accountId || account}`,
        label: account,
      });
      lastAccount = account;
      lastPartner = '';
    }
    if (partner !== lastPartner) {
      const count = items.filter(
        row =>
          (row.account?.trim() || 'Unassigned account') === account &&
          (row.partner?.trim() || 'No partner') === partner,
      ).length;
      rows.push({
        type: 'partner',
        key: `partner-${item.accountId}-${item.partnerId || partner}`,
        label: partner,
        count,
      });
      lastPartner = partner;
    }
    rows.push({ type: 'item', key: item.id, item });
  }
  return rows;
}

export default function ReconcileScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const query = useModuleSearch(
    'Search reconcile items by partner, account, or entry',
  );
  useHeaderActions(EMPTY_HEADER_ACTIONS);

  const [rows, setRows] = useState<ReconcileItem[]>([]);
  const [residualTotal, setResidualTotal] = useState(0);
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
        const { rows: data, residualTotal: total } = await fetchReconcileItems(
          session.token,
          {
            q: query.trim() || undefined,
            limit: 500,
            offset: 0,
          },
        );
        setRows(data);
        setResidualTotal(total);
        setPage(1);
        hasLoadedOnceRef.current = true;
      } catch (err) {
        if (!soft) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load items to reconcile.',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.token, query],
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
      ['date', 'name', 'partner', 'residual'].includes(col.key),
    );
  }, [isDesktop]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pagedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const grouped = useMemo(() => buildGroupedRows(pagedItems), [pagedItems]);

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
            Journal Items to Reconcile
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {rows.length} item{rows.length === 1 ? '' : 's'} · Posted with
            residual
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
            Residual {formatMoney(residualTotal)}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      ) : pagedItems.length === 0 ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.emptyWrap}
          refreshControl={refreshControl}>
          <Icon
            source="swap-horizontal-bold"
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
            {query.trim()
              ? 'No matching items to reconcile'
              : 'Nothing left to reconcile'}
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
            {grouped.map(row => {
              if (row.type === 'account') {
                return (
                  <View
                    key={row.key}
                    style={[
                      styles.groupRow,
                      {
                        backgroundColor: theme.colors.secondaryContainer,
                        borderBottomColor:
                          theme.colors.outlineVariant ?? theme.colors.outline,
                      },
                    ]}>
                    <Text
                      style={{
                        color: theme.colors.onSecondaryContainer,
                        fontWeight: '700',
                        fontSize: 13,
                      }}
                      numberOfLines={1}>
                      {row.label}
                    </Text>
                  </View>
                );
              }
              if (row.type === 'partner') {
                return (
                  <View
                    key={row.key}
                    style={[
                      styles.partnerRow,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderBottomColor:
                          theme.colors.outlineVariant ?? theme.colors.outline,
                      },
                    ]}>
                    <Text
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        fontWeight: '600',
                        fontSize: 12,
                      }}
                      numberOfLines={1}>
                      {row.label} · {row.count} item
                      {row.count === 1 ? '' : 's'}
                    </Text>
                  </View>
                );
              }

              const item = row.item;
              return (
                <Pressable
                  key={row.key}
                  style={({ hovered, pressed }) => [
                    styles.dataRow,
                    {
                      backgroundColor:
                        hovered || pressed
                          ? theme.colors.primaryContainer
                          : theme.colors.surface,
                      borderBottomColor:
                        theme.colors.outlineVariant ?? theme.colors.outline,
                    },
                  ]}>
                  {visibleColumns.map(col => {
                    if (col.key === 'partner') {
                      return (
                        <View
                          key={col.key}
                          style={[styles.cell, { flex: col.flex }]}>
                          <CustomerNameText numberOfLines={1}>
                            {item.partner || '—'}
                          </CustomerNameText>
                        </View>
                      );
                    }
                    let text = '—';
                    switch (col.key) {
                      case 'date':
                        text =
                          formatMyanmarDate(item.date) || item.date || '—';
                        break;
                      case 'name':
                        text = item.name || '—';
                        break;
                      case 'journalEntry':
                        text = item.journalEntry || '—';
                        break;
                      case 'reference':
                        text = item.reference || '—';
                        break;
                      case 'debit':
                        text = formatMoney(item.debit, item.currency);
                        break;
                      case 'credit':
                        text = formatMoney(item.credit, item.currency);
                        break;
                      case 'residual':
                        text = formatMoney(item.residual, item.currency);
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
                          col.key === 'residual' || col.key === 'name'
                            ? styles.bold
                            : null,
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
        itemLabel="item"
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
  groupRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  partnerRow: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
