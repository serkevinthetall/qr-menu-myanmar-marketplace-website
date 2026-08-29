/**
 * On Hand list — current stock quantities from Odoo (accounting).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Snackbar,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';

import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleFilters,
  useModuleSearch,
  useSearch,
} from '@/contexts/search-context';
import {
  exportOnHandExcel,
  fetchOnHandProducts,
  type OnHandProduct,
} from '@/features/inventory';
import { useResponsive } from '@/hooks/use-responsive';

const PAGE_SIZE = 50;

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function OnHandScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const { setFiltersExpanded } = useSearch();
  const query = useModuleSearch('Search products by name or SKU');

  const [hideZero, setHideZero] = useState(false);
  const [rows, setRows] = useState<OnHandProduct[]>([]);
  const [totalOnHand, setTotalOnHand] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setFiltersExpanded(true);
    return () => setFiltersExpanded(false);
  }, [setFiltersExpanded]);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!session?.token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!opts?.soft) setLoading(true);
      setError('');
      try {
        const { rows: data, meta } = await fetchOnHandProducts(session.token, {
          q: query.trim() || undefined,
          hideZero,
          limit: 500,
          offset: 0,
        });
        setRows(data);
        setTotalOnHand(meta.totalOnHand);
        setPage(1);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load on-hand stock.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.token, query, hideZero],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ soft: true });
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const exportExcel = useCallback(() => {
    if (rows.length === 0) {
      setError('Nothing to export.');
      return;
    }
    const ok = exportOnHandExcel(rows, { totalOnHand });
    if (!ok) setError('Excel export is available on web only.');
  }, [rows, totalOnHand]);

  const headerActions = useMemo<HeaderAction[]>(
    () => [
      {
        key: 'excel',
        icon: 'microsoft-excel',
        onPress: exportExcel,
        accessibilityLabel: 'Export On Hand to Excel',
      },
    ],
    [exportExcel],
  );
  useHeaderActions(headerActions);

  const filterPanel = useMemo(
    () => (
      <View style={styles.headerFilterPanel}>
        <View style={styles.hideZeroRow}>
          <Text variant="bodyMedium">Hide zero stock</Text>
          <Switch value={hideZero} onValueChange={setHideZero} />
        </View>
      </View>
    ),
    [hideZero],
  );
  useModuleFilters(filterPanel);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading on-hand stock…</Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.summaryBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.outline,
          },
        ]}>
        <View style={styles.summaryCopy}>
          <Text variant="titleSmall" style={{ fontWeight: '700' }}>
            On Hand
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {rows.length} product{rows.length === 1 ? '' : 's'}
            {hideZero ? ' · zeros hidden' : ''}
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
            {formatQty(totalOnHand)} total qty
          </Text>
        </View>
      </View>

      {paged.length === 0 ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.emptyWrap}
          refreshControl={refreshControl}>
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {query.trim()
              ? 'No matching products.'
              : hideZero
                ? 'No products with stock.'
                : 'No stockable products found.'}
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.flex}>
          <View
            style={[
              styles.listHeader,
              { backgroundColor: theme.colors.primary },
            ]}>
            <Text style={[styles.listHeaderText, styles.nameCol]}>Product</Text>
            {isDesktop ? (
              <Text style={[styles.listHeaderText, styles.skuCol]}>SKU</Text>
            ) : null}
            {isDesktop ? (
              <Text style={[styles.listHeaderText, styles.catCol]}>
                Category
              </Text>
            ) : null}
            <Text style={[styles.listHeaderText, styles.qtyCol]}>On hand</Text>
            <Text style={[styles.listHeaderText, styles.unitCol]}>Unit</Text>
          </View>
          <ScrollView style={styles.flex} refreshControl={refreshControl}>
            {paged.map((row, index) => {
              const zebra = index % 2 === 1;
              return (
                <View
                  key={row.id}
                  style={[
                    styles.listRow,
                    {
                      backgroundColor: zebra
                        ? theme.colors.surfaceVariant
                        : theme.colors.surface,
                      borderBottomColor:
                        theme.colors.outlineVariant ?? theme.colors.outline,
                    },
                  ]}>
                  <View style={[styles.cell, styles.nameCol]}>
                    <Text style={styles.cellText} numberOfLines={2}>
                      {row.name || '—'}
                    </Text>
                    {!isDesktop && row.sku ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: theme.colors.onSurfaceVariant,
                        }}
                        numberOfLines={1}>
                        {row.sku}
                      </Text>
                    ) : null}
                  </View>
                  {isDesktop ? (
                    <View style={[styles.cell, styles.skuCol]}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {row.sku || '—'}
                      </Text>
                    </View>
                  ) : null}
                  {isDesktop ? (
                    <View style={[styles.cell, styles.catCol]}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {row.category || '—'}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.cell, styles.qtyCol]}>
                    <Text style={styles.qtyText}>{formatQty(row.onHand)}</Text>
                  </View>
                  <View style={[styles.cell, styles.unitCol]}>
                    <Text style={styles.cellText} numberOfLines={1}>
                      {row.unit || '—'}
                    </Text>
                  </View>
                </View>
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
        centerLabel={formatQty(totalOnHand)}
        itemLabel="product"
      />

      <Snackbar
        visible={Boolean(error)}
        onDismiss={() => setError('')}
        duration={5000}>
        {error}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  headerFilterPanel: {
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  hideZeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  summaryCopy: { flex: 1, minWidth: 0 },
  statChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  listHeaderText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: { paddingRight: 8, minWidth: 0 },
  cellText: { fontSize: 13 },
  qtyText: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  nameCol: { flex: 2.4 },
  skuCol: { flex: 1.2 },
  catCol: { flex: 1.4 },
  qtyCol: { flex: 1, alignItems: 'flex-end' },
  unitCol: { flex: 0.8 },
});
