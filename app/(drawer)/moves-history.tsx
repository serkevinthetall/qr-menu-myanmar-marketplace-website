/**
 * Moves History — done stock.move.line rows from Odoo (accounting audit).
 */
import { useFocusEffect } from 'expo-router';
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
  Text,
  useTheme,
} from 'react-native-paper';

import { DropdownField } from '@/components/ui/DropdownField';
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
  buildMonthOptions,
  currentMonthKey,
  exportStockMovesExcel,
  fetchProductCategories,
  fetchStockMoves,
  formatMonthLabel,
  monthLabelToKey,
  type StockMoveLine,
} from '@/features/inventory';
import { useResponsive } from '@/hooks/use-responsive';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

const PAGE_SIZE = 50;

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function MovesHistoryScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const { setFiltersExpanded } = useSearch();

  const monthOptions = useMemo(() => buildMonthOptions(24), []);
  const monthLabels = useMemo(
    () => monthOptions.map(opt => opt.label),
    [monthOptions],
  );

  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const selectedMonthLabel = formatMonthLabel(monthKey);

  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const ALL_CATEGORIES = 'All categories';

  const selectedCategoryLabel = category || ALL_CATEGORIES;

  const searchPlaceholder = useMemo(
    () =>
      `Search product name · ${selectedMonthLabel} · ${selectedCategoryLabel}`,
    [selectedMonthLabel, selectedCategoryLabel],
  );
  const query = useModuleSearch(searchPlaceholder);

  const [rows, setRows] = useState<StockMoveLine[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useFocusEffect(
    useCallback(() => {
      setMonthKey(currentMonthKey());
      setFiltersExpanded(true);
      return () => setFiltersExpanded(false);
    }, [setFiltersExpanded]),
  );

  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;
    void fetchProductCategories(session.token)
      .then(names => {
        if (!cancelled) setCategories(names);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.token]);

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
        const { rows: data, meta } = await fetchStockMoves(session.token, {
          month: monthKey,
          q: query.trim() || undefined,
          category: category || undefined,
          limit: 500,
          offset: 0,
        });
        setRows(data);
        setTotalQuantity(meta.totalQuantity);
        setPage(1);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load moves history.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.token, monthKey, query, category],
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

  /** Category first, then product — mirrors Odoo Category > Product grouping. */
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const cat = (a.category || '').localeCompare(b.category || '', undefined, {
        sensitivity: 'base',
      });
      if (cat !== 0) return cat;
      const prod = (a.productName || '').localeCompare(
        b.productName || '',
        undefined,
        { sensitivity: 'base' },
      );
      if (prod !== 0) return prod;
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }, [rows]);

  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, safePage]);

  const exportExcel = useCallback(() => {
    if (rows.length === 0) {
      setError('Nothing to export.');
      return;
    }
    const ok = exportStockMovesExcel(rows, {
      monthKey,
      totalQuantity,
    });
    if (!ok) setError('Excel export is available on web only.');
  }, [rows, monthKey, totalQuantity]);

  const headerActions = useMemo<HeaderAction[]>(
    () => [
      {
        key: 'excel',
        icon: 'microsoft-excel',
        onPress: exportExcel,
        accessibilityLabel: 'Export Moves History to Excel',
      },
    ],
    [exportExcel],
  );
  useHeaderActions(headerActions);

  const filterPanel = useMemo(
    () => (
      <View style={styles.headerFilterPanel}>
        <View style={styles.headerFilterControls}>
          <View style={styles.filterField}>
            <DropdownField
              compact
              variant="header"
              placeholder="Month"
              value={selectedMonthLabel}
              options={monthLabels}
              onChange={label =>
                setMonthKey(monthLabelToKey(label, monthOptions))
              }
              sortOptions={false}
              showClearOption={false}
            />
          </View>
          <View style={styles.filterField}>
            <DropdownField
              compact
              variant="header"
              placeholder="Category"
              value={selectedCategoryLabel}
              options={
                categories.length > 0
                  ? [ALL_CATEGORIES, ...categories]
                  : [ALL_CATEGORIES]
              }
              onChange={label => {
                setCategory(label === ALL_CATEGORIES ? '' : label);
              }}
              sortOptions={false}
              showClearOption={false}
            />
          </View>
        </View>
      </View>
    ),
    [
      selectedMonthLabel,
      monthLabels,
      monthOptions,
      selectedCategoryLabel,
      categories,
    ],
  );
  useModuleFilters(filterPanel);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading moves history…</Text>
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
            {selectedMonthLabel}
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            Done moves · {rows.length} line{rows.length === 1 ? '' : 's'}
            {category ? ` · ${category}` : ''}
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
            {formatQty(totalQuantity)} qty
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
              ? 'No matching move lines.'
              : `No done moves for ${selectedMonthLabel}.`}
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.flex}>
          <View
            style={[
              styles.listHeader,
              { backgroundColor: theme.colors.primary },
            ]}>
            <Text style={[styles.listHeaderText, styles.dateCol]}>Date</Text>
            {isDesktop ? (
              <Text style={[styles.listHeaderText, styles.catCol]}>
                Category
              </Text>
            ) : null}
            <Text style={[styles.listHeaderText, styles.productCol]}>
              Product
            </Text>
            {isDesktop ? (
              <Text style={[styles.listHeaderText, styles.fromCol]}>From</Text>
            ) : null}
            {isDesktop ? (
              <Text style={[styles.listHeaderText, styles.toCol]}>To</Text>
            ) : null}
            <Text style={[styles.listHeaderText, styles.qtyCol]}>Qty</Text>
            {isDesktop ? (
              <Text style={[styles.listHeaderText, styles.refCol]}>
                Reference
              </Text>
            ) : null}
          </View>
          <ScrollView style={styles.flex} refreshControl={refreshControl}>
            {paged.map((row, index) => {
              const zebra = index % 2 === 1;
              const prevCategory =
                index > 0 ? paged[index - 1]?.category || '' : null;
              const categoryLabel = row.category?.trim() || 'Uncategorized';
              const showCategoryBreak =
                isDesktop &&
                (index === 0 || prevCategory !== (row.category || ''));
              return (
                <View key={row.id}>
                  {showCategoryBreak ? (
                    <View
                      style={[
                        styles.categoryBreak,
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
                          fontSize: 12,
                        }}
                        numberOfLines={1}>
                        {categoryLabel}
                      </Text>
                    </View>
                  ) : null}
                  <View
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
                    <View style={[styles.cell, styles.dateCol]}>
                      <Text style={styles.cellText}>
                        {row.date ? formatMyanmarDate(row.date) : '—'}
                      </Text>
                    </View>
                    {isDesktop ? (
                      <View style={[styles.cell, styles.catCol]}>
                        <Text style={styles.cellText} numberOfLines={2}>
                          {row.category || '—'}
                        </Text>
                      </View>
                    ) : null}
                    <View style={[styles.cell, styles.productCol]}>
                      <Text style={styles.cellText} numberOfLines={2}>
                        {row.productName || '—'}
                      </Text>
                      {!isDesktop ? (
                        <Text
                          style={{
                            fontSize: 12,
                            color: theme.colors.onSurfaceVariant,
                          }}
                          numberOfLines={1}>
                          {[
                            row.category || 'Uncategorized',
                            [row.fromLocation, row.toLocation]
                              .filter(Boolean)
                              .join(' → ') || row.reference,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      ) : null}
                    </View>
                    {isDesktop ? (
                      <View style={[styles.cell, styles.fromCol]}>
                        <Text style={styles.cellText} numberOfLines={2}>
                          {row.fromLocation || '—'}
                        </Text>
                      </View>
                    ) : null}
                    {isDesktop ? (
                      <View style={[styles.cell, styles.toCol]}>
                        <Text style={styles.cellText} numberOfLines={2}>
                          {row.toLocation || '—'}
                        </Text>
                      </View>
                    ) : null}
                    <View style={[styles.cell, styles.qtyCol]}>
                      <Text style={styles.qtyText}>
                        {formatQty(row.quantity)}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: theme.colors.onSurfaceVariant,
                          textAlign: 'right',
                        }}>
                        {row.unit || ''}
                      </Text>
                    </View>
                    {isDesktop ? (
                      <View style={[styles.cell, styles.refCol]}>
                        <Text style={styles.cellText} numberOfLines={1}>
                          {row.reference || '—'}
                        </Text>
                      </View>
                    ) : null}
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
        centerLabel={formatQty(totalQuantity)}
        itemLabel="line"
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
  headerFilterControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterField: { minWidth: 180 },
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
  categoryBreak: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateCol: { flex: 1 },
  catCol: { flex: 1.3 },
  productCol: { flex: 2 },
  fromCol: { flex: 1.3 },
  toCol: { flex: 1.3 },
  qtyCol: { flex: 0.85, alignItems: 'flex-end' },
  refCol: { flex: 1.1 },
});
