/**
 * Chart of Accounts — Odoo account.account.
 * Left code-prefix panel matches Odoo searchpanel (All / 1 / 2 / …).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Icon, Switch, Text, useTheme } from 'react-native-paper';

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
import { ChartAccount } from '@/types/chart-account';

const PAGE_SIZE = 50;
const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];

const COLUMNS = [
  { key: 'code', label: 'Code', flex: 1 },
  { key: 'name', label: 'Account Name', flex: 2.2 },
  { key: 'type', label: 'Type', flex: 1.4 },
  { key: 'reconcile', label: 'Payment Reconciliation', flex: 1.4 },
];

type PrefixNode = {
  prefix: string;
  label: string;
  count: number;
  children: PrefixNode[];
};

function buildCodePrefixTree(accounts: ChartAccount[]): PrefixNode[] {
  const codes = accounts
    .map(row => row.code.trim())
    .filter(code => code.length > 0);

  const byRoot = new Map<string, string[]>();
  for (const code of codes) {
    const root = code[0]!;
    const list = byRoot.get(root) ?? [];
    list.push(code);
    byRoot.set(root, list);
  }

  return [...byRoot.entries()]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([root, rootCodes]) => {
      const byTwo = new Map<string, string[]>();
      for (const code of rootCodes) {
        if (code.length < 2) continue;
        const key = code.slice(0, 2);
        const list = byTwo.get(key) ?? [];
        list.push(code);
        byTwo.set(key, list);
      }

      const children: PrefixNode[] = [...byTwo.entries()]
        .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
        .map(([two, twoCodes]) => {
          const byThree = new Map<string, number>();
          for (const code of twoCodes) {
            if (code.length < 3) continue;
            const key = code.slice(0, 3);
            byThree.set(key, (byThree.get(key) ?? 0) + 1);
          }
          const grandChildren =
            byThree.size > 1
              ? [...byThree.entries()]
                  .sort(([a], [b]) =>
                    a.localeCompare(b, undefined, { numeric: true }),
                  )
                  .map(([three, count]) => ({
                    prefix: three,
                    label: three,
                    count,
                    children: [] as PrefixNode[],
                  }))
              : [];

          return {
            prefix: two,
            label: two,
            count: twoCodes.length,
            children: grandChildren,
          };
        });

      return {
        prefix: root,
        label: root,
        count: rootCodes.length,
        children,
      };
    });
}

export default function ChartOfAccountsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const query = useModuleSearch('Search accounts by code or name');
  useHeaderActions(EMPTY_HEADER_ACTIONS);

  const [codePrefix, setCodePrefix] = useState('');
  const [expandedPrefixes, setExpandedPrefixes] = useState<Set<string>>(
    () => new Set(),
  );
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
    [session?.token, query],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ soft: true });
  }, [load]);

  const prefixTree = useMemo(() => buildCodePrefixTree(rows), [rows]);

  const filteredRows = useMemo(() => {
    if (!codePrefix) return rows;
    return rows.filter(row => row.code.trim().startsWith(codePrefix));
  }, [rows, codePrefix]);

  useEffect(() => {
    setPage(1);
  }, [codePrefix]);

  const visibleColumns = useMemo(() => {
    if (isDesktop) return COLUMNS;
    return COLUMNS.filter(col =>
      ['code', 'name', 'type', 'reconcile'].includes(col.key),
    );
  }, [isDesktop]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const reconcilableCount = useMemo(
    () => filteredRows.filter(row => row.reconcile).length,
    [filteredRows],
  );

  const toggleExpanded = useCallback((prefix: string) => {
    setExpandedPrefixes(prev => {
      const next = new Set(prev);
      if (next.has(prefix)) next.delete(prefix);
      else next.add(prefix);
      return next;
    });
  }, []);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  const renderPrefixNode = (node: PrefixNode, depth: number) => {
    const selected = codePrefix === node.prefix;
    const expanded = expandedPrefixes.has(node.prefix);
    const hasChildren = node.children.length > 0;

    return (
      <View key={node.prefix}>
        <View style={styles.prefixRow}>
          {hasChildren ? (
            <Pressable
              onPress={() => toggleExpanded(node.prefix)}
              hitSlop={6}
              style={styles.prefixChevron}
              accessibilityLabel={
                expanded ? `Collapse ${node.label}` : `Expand ${node.label}`
              }>
              <Icon
                source={expanded ? 'chevron-down' : 'chevron-right'}
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
            </Pressable>
          ) : (
            <View style={styles.prefixChevronSpacer} />
          )}
          <Pressable
            onPress={() =>
              setCodePrefix(prev => (prev === node.prefix ? '' : node.prefix))
            }
            style={({ hovered, pressed }) => [
              styles.prefixLabelBtn,
              {
                paddingLeft: depth * 8,
                backgroundColor:
                  selected || hovered || pressed
                    ? theme.colors.secondaryContainer
                    : 'transparent',
              },
            ]}>
            <Text
              numberOfLines={1}
              style={{
                color: selected
                  ? theme.colors.onSecondaryContainer
                  : theme.colors.onSurface,
                fontWeight: selected ? '700' : '600',
                fontSize: 13,
              }}>
              {node.label}
            </Text>
          </Pressable>
        </View>
        {expanded
          ? node.children.map(child => renderPrefixNode(child, depth + 1))
          : null}
      </View>
    );
  };

  if (loading && !hasLoadedOnceRef.current) {
    return <ListSkeleton variant="invoices" />;
  }

  const listBody =
    error ? (
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
          {query.trim() || codePrefix
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
    );

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
            {filteredRows.length} account
            {filteredRows.length === 1 ? '' : 's'}
            {codePrefix ? ` · code ${codePrefix}…` : ''} · from Odoo
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

      <View style={styles.bodyRow}>
        <View
          style={[
            styles.searchPanel,
            {
              backgroundColor: theme.colors.surface,
              borderRightColor:
                theme.colors.outlineVariant ?? theme.colors.outline,
            },
          ]}>
          <Pressable
            onPress={() => setCodePrefix('')}
            style={({ hovered, pressed }) => [
              styles.allBtn,
              {
                backgroundColor:
                  !codePrefix || hovered || pressed
                    ? theme.colors.secondaryContainer
                    : 'transparent',
              },
            ]}>
            <Text
              style={{
                color: !codePrefix
                  ? theme.colors.onSecondaryContainer
                  : theme.colors.onSurface,
                fontWeight: !codePrefix ? '700' : '600',
                fontSize: 13,
              }}>
              All
            </Text>
          </Pressable>
          <ScrollView style={styles.flex} showsVerticalScrollIndicator={false}>
            {prefixTree.map(node => renderPrefixNode(node, 0))}
          </ScrollView>
        </View>
        <View style={styles.flex}>{listBody}</View>
      </View>

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={filteredRows.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        centerLabel={`${filteredRows.length} from Odoo`}
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
  bodyRow: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
  },
  searchPanel: {
    width: 72,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
    paddingBottom: 8,
  },
  allBtn: {
    marginHorizontal: 6,
    marginBottom: 4,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  prefixRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  prefixChevron: {
    width: 22,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefixChevronSpacer: {
    width: 22,
  },
  prefixLabelBtn: {
    flex: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginRight: 4,
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
