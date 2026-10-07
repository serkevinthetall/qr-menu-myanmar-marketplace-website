/**
 * Chart of Accounts — Odoo account.account.
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
import { Chip, Icon, Switch, Text, useTheme } from 'react-native-paper';

import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchChartOfAccounts } from '@/services/chart-of-accounts';
import {
  ChartAccount,
  ChartAccountFilter,
} from '@/types/chart-account';

const PAGE_SIZE = 50;
const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];

const FILTERS: { key: ChartAccountFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reconcilable', label: 'Reconcilable' },
  { key: 'asset_receivable', label: 'Receivable' },
  { key: 'liability_payable', label: 'Payable' },
  { key: 'asset_cash', label: 'Bank and Cash' },
  { key: 'asset_current', label: 'Current Assets' },
  { key: 'income', label: 'Income' },
  { key: 'expense', label: 'Expenses' },
];

const COLUMNS = [
  { key: 'code', label: 'Code', flex: 1 },
  { key: 'name', label: 'Account Name', flex: 2.2 },
  { key: 'type', label: 'Type', flex: 1.4 },
  { key: 'reconcile', label: 'Payment Reconciliation', flex: 1.4 },
];

export default function ChartOfAccountsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const query = useModuleSearch('Search accounts by code or name');
  useHeaderActions(EMPTY_HEADER_ACTIONS);

  const [typeFilter, setTypeFilter] = useState<ChartAccountFilter>('all');
  const [rows, setRows] = useState<ChartAccount[]>([]);
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
        const data = await fetchChartOfAccounts(session.token, {
          q: query.trim() || undefined,
          filter: typeFilter === 'all' ? undefined : typeFilter,
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
              : 'Failed to load chart of accounts.',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.token, query, typeFilter],
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
      ['code', 'name', 'type', 'reconcile'].includes(col.key),
    );
  }, [isDesktop]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const reconcilableCount = useMemo(
    () => rows.filter(row => row.reconcile).length,
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
            Chart of Accounts
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {rows.length} account{rows.length === 1 ? '' : 's'} · from Odoo
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
            {reconcilableCount} reconcilable
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
          {FILTERS.map(item => {
            const selected = typeFilter === item.key;
            return (
              <Chip
                key={item.key}
                compact
                selected={selected}
                onPress={() => setTypeFilter(item.key)}
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
            source="bookshelf"
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
            {query.trim() || typeFilter !== 'all'
              ? 'No matching accounts'
              : 'No accounts found'}
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
                    if (col.key === 'reconcile') {
                      return (
                        <View
                          key={col.key}
                          style={[styles.cell, { flex: col.flex }]}>
                          <Switch
                            value={row.reconcile}
                            disabled
                            color={theme.colors.primary}
                          />
                        </View>
                      );
                    }
                    let text = '—';
                    switch (col.key) {
                      case 'code':
                        text = row.code || '—';
                        break;
                      case 'name':
                        text = row.name || '—';
                        break;
                      case 'type':
                        text = row.typeLabel || '—';
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
                          col.key === 'code' ? styles.bold : null,
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
        itemLabel="account"
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
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
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
