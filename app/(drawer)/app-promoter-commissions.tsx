/**
 * App Promoter Commission list from Odoo — filter by month and promoter in the header.
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
  useModuleFilters,
  useModuleSearch,
  useSearch,
} from '@/contexts/search-context';
import { ENABLE_APP_INSTALL_CALL_LIST } from '@/features/app-install';
import { mongoSaveErrorMessage } from '@/features/app-install/MongoSaveErrorDialog';
import {
  buildMonthOptions,
  currentMonthKey,
  fetchAppPromoterCommissions,
  formatMonthLabel,
  monthLabelToKey,
  type AppPromoterCommission,
} from '@/features/app-promoter-commissions';
import { fetchAppPromoters, type AppPromoter } from '@/features/app-promoters';
import { useResponsive } from '@/hooks/use-responsive';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

const PAGE_SIZE = 50;
const ALL_PROMOTERS_LABEL = 'All promoters';

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function AppPromoterCommissionsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const enabled = ENABLE_APP_INSTALL_CALL_LIST;
  const { setFiltersExpanded } = useSearch();

  const monthOptions = useMemo(() => buildMonthOptions(24), []);
  const monthLabels = useMemo(
    () => monthOptions.map(opt => opt.label),
    [monthOptions],
  );

  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const [promoterId, setPromoterId] = useState('');
  const [promoters, setPromoters] = useState<AppPromoter[]>([]);
  const [promotersLoading, setPromotersLoading] = useState(false);

  const selectedMonthLabel = formatMonthLabel(monthKey);
  const selectedPromoterName = useMemo(() => {
    if (!promoterId) return ALL_PROMOTERS_LABEL;
    return promoters.find(row => row.id === promoterId)?.name ?? ALL_PROMOTERS_LABEL;
  }, [promoterId, promoters]);

  const searchPlaceholder = useMemo(
    () =>
      `Search · ${selectedMonthLabel} · ${selectedPromoterName}`,
    [selectedMonthLabel, selectedPromoterName],
  );

  const query = useModuleSearch(searchPlaceholder, enabled);

  const [rows, setRows] = useState<AppPromoterCommission[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useFocusEffect(
    useCallback(() => {
      if (enabled) {
        setMonthKey(currentMonthKey());
        setFiltersExpanded(true);
      }
      return () => setFiltersExpanded(false);
    }, [enabled, setFiltersExpanded]),
  );

  const promoterPickerOptions = useMemo(
    () => [ALL_PROMOTERS_LABEL, ...promoters.map(row => row.name)],
    [promoters],
  );

  const loadPromoters = useCallback(async () => {
    if (!enabled || !session?.token) {
      setPromoters([]);
      return;
    }
    setPromotersLoading(true);
    try {
      const data = await fetchAppPromoters(session.token);
      setPromoters(data.filter(row => row.active));
    } catch {
      setPromoters([]);
    } finally {
      setPromotersLoading(false);
    }
  }, [enabled, session?.token]);

  useEffect(() => {
    void loadPromoters();
  }, [loadPromoters]);

  const load = useCallback(async () => {
    if (!enabled || !session?.token) {
      setRows([]);
      setTotalAmount(0);
      setLoading(false);
      return;
    }
    try {
      const { rows: data, meta } = await fetchAppPromoterCommissions(
        session.token,
        {
          month: monthKey,
          promoterId: promoterId || undefined,
          q: query.trim() || undefined,
          limit: 500,
        },
      );
      setRows(data);
      setTotalAmount(meta.totalAmount ?? 0);
      setError('');
    } catch (err) {
      setRows([]);
      setTotalAmount(0);
      setError(mongoSaveErrorMessage(err, 'Loading commissions'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled, session?.token, monthKey, promoterId, query]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      void load();
    }, 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [monthKey, promoterId, query]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

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
              onChange={label => setMonthKey(monthLabelToKey(label, monthOptions))}
              sortOptions={false}
              showClearOption={false}
            />
          </View>
          <View style={styles.filterField}>
            <DropdownField
              compact
              variant="header"
              placeholder="App Promoter"
              value={selectedPromoterName}
              options={
                promotersLoading && promoterPickerOptions.length <= 1
                  ? [ALL_PROMOTERS_LABEL]
                  : promoterPickerOptions
              }
              onChange={label => {
                if (label === ALL_PROMOTERS_LABEL) {
                  setPromoterId('');
                  return;
                }
                const match = promoters.find(row => row.name === label);
                setPromoterId(match?.id ?? '');
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
      selectedPromoterName,
      promoterPickerOptions,
      promoters,
      promotersLoading,
    ],
  );

  useModuleFilters(filterPanel, enabled);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  if (!enabled) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium">App Promoter Commission is turned off</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading commissions…</Text>
      </View>
    );
  }

  const emptyLabel = query.trim()
    ? 'No matching commission lines.'
    : `No commissions for ${selectedMonthLabel}${
        promoterId ? ` · ${selectedPromoterName}` : ''
      }.`;

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
            {selectedPromoterName} · {rows.length} line
            {rows.length === 1 ? '' : 's'}
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
            {formatAmount(totalAmount)} total
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
            {emptyLabel}
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
            <Text style={[styles.listHeaderText, styles.promoterCol]}>
              Promoter
            </Text>
            <Text style={[styles.listHeaderText, styles.customerCol]}>
              Customer
            </Text>
            {isDesktop ? (
              <Text style={[styles.listHeaderText, styles.orderCol]}>
                Sale order
              </Text>
            ) : null}
            <Text style={[styles.listHeaderText, styles.amountCol]}>Amount</Text>
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
                  <View style={[styles.cell, styles.dateCol]}>
                    <Text style={styles.cellText}>
                      {row.date ? formatMyanmarDate(row.date) : '—'}
                    </Text>
                  </View>
                  <View style={[styles.cell, styles.promoterCol]}>
                    <Text style={styles.cellText} numberOfLines={1}>
                      {row.promoterName || '—'}
                    </Text>
                  </View>
                  <View style={[styles.cell, styles.customerCol]}>
                    <Text style={styles.cellText} numberOfLines={1}>
                      {row.customerName || '—'}
                    </Text>
                    {!isDesktop && row.saleOrderName ? (
                      <Text
                        style={{
                          fontSize: 12,
                          color: theme.colors.onSurfaceVariant,
                        }}
                        numberOfLines={1}>
                        {row.saleOrderName}
                      </Text>
                    ) : null}
                  </View>
                  {isDesktop ? (
                    <View style={[styles.cell, styles.orderCol]}>
                      <Text style={styles.cellText} numberOfLines={1}>
                        {row.saleOrderName || '—'}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.cell, styles.amountCol]}>
                    <Text style={styles.amountText}>
                      {formatAmount(row.amount)}
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
        centerLabel={formatAmount(totalAmount)}
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
    width: '100%',
  },
  filterField: {
    minWidth: 160,
    maxWidth: 240,
    flexGrow: 1,
  },
  summaryBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryCopy: { flex: 1, minWidth: 0 },
  statChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  listHeaderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  cellText: { fontSize: 14, fontWeight: '500' },
  amountText: { fontSize: 14, fontWeight: '700' },
  dateCol: { width: 108 },
  promoterCol: { flex: 1.1, minWidth: 0 },
  customerCol: { flex: 1.4, minWidth: 0 },
  orderCol: { width: 110 },
  amountCol: { width: 100, alignItems: 'flex-end' },
  emptyWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
