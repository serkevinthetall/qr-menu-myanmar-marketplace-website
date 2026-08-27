import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Menu, Text, TextInput, useTheme } from 'react-native-paper';

import { VerticalBarChart } from '@/components/overview/VerticalBarChart';
import { CompareAiPanel } from '@/components/overview/CompareAiPanel';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useSearch,
} from '@/contexts/search-context';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { useCompareAi } from '@/hooks/use-compare-ai';
import {
  fetchOverviewRankings,
  fetchOverviewSixMonthExport,
} from '@/services/insights';
import { exportOverviewSixMonthExcel } from '@/utils/export-overview-six-month-excel';
import {
  OverviewCompareMode,
  OverviewPeriod,
  OverviewRankings,
} from '@/types/overview';

export type OverviewRankingKind = 'customers' | 'areas';

type OverviewRankingDetailViewProps = {
  kind: OverviewRankingKind;
  period: OverviewPeriod;
};

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (safe >= 1_000_000) {
    return `${(safe / 1_000_000).toFixed(1)}M`;
  }
  if (safe >= 10_000) {
    return `${Math.round(safe / 1000)}k`;
  }
  return safe.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatFullMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  })} MMK`;
}

function periodLabel(period: OverviewPeriod): string {
  switch (period) {
    case 'day':
      return 'Today';
    case 'week':
      return 'This week';
    case 'month':
      return 'This month';
    default:
      return 'This month';
  }
}

const CUSTOMER_CHART_LIMIT = 15;
const CUSTOMER_COMPARE_LIMIT = 10;
const AREA_NATIONWIDE_CHART_LIMIT = 15;
const AREA_COMPARE_LIMIT = 10;

export function OverviewRankingDetailView({
  kind,
  period,
}: OverviewRankingDetailViewProps) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { setDetailHeader } = useSearch();
  const { width } = useResponsive();
  const isMobile = width < 900;
  const token = session?.token ?? '';
  const selectedPeriodLabel = periodLabel(period);
  const title =
    kind === 'customers' ? 'Most spending customers' : 'Top buying areas';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewRankings | null>(null);
  const [compareMode, setCompareMode] = useState<OverviewCompareMode>('off');
  const [compareMenuOpen, setCompareMenuOpen] = useState(false);
  const [stateMenuOpen, setStateMenuOpen] = useState(false);
  const [stateFilterId, setStateFilterId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'total' | 'name'>('total');
  const [compareLoaded, setCompareLoaded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/overview');
  }, [router]);

  const exportSixMonth = useCallback(async () => {
    if (kind !== 'customers' || !token || exporting) {
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const payload = await fetchOverviewSixMonthExport(token, 'customers');
      const ok = exportOverviewSixMonthExcel(payload);
      if (!ok) {
        setError('Excel export is only available on web.');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to export six-month customers.',
      );
    } finally {
      setExporting(false);
    }
  }, [exporting, kind, token]);

  const headerActions = useMemo<HeaderAction[]>(
    () =>
      kind === 'customers'
        ? [
            {
              key: 'excel-6m',
              icon: exporting ? 'loading' : 'microsoft-excel',
              onPress: () => {
                void exportSixMonth();
              },
              accessibilityLabel: 'Export six months customers to Excel',
              label: exporting ? 'Exporting…' : 'Export 6 months',
            },
          ]
        : [],
    [exportSixMonth, exporting, kind],
  );

  useHeaderActions(headerActions);

  useFocusEffect(
    useCallback(() => {
      setDetailHeader({
        title,
        breadcrumbParent: 'Overview',
        onBack: goBack,
      });
      return () => setDetailHeader(null);
    }, [goBack, setDetailHeader, title]),
  );

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Please log in again.');
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCompareMode('off');
    setStateFilterId(null);
    setSearch('');
    setSortKey('total');
    setCompareLoaded(false);

    void (async () => {
      try {
        const rankings = await fetchOverviewRankings(token, period, false);
        if (!cancelled) {
          setData(rankings);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load rankings.',
          );
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, period, kind]);

  useEffect(() => {
    if (!token || compareMode !== 'last_month' || compareLoaded) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const rankings = await fetchOverviewRankings(token, period, true);
        if (!cancelled) {
          setData(rankings);
          setCompareLoaded(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load last month.',
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [compareLoaded, compareMode, period, token]);

  const showCompare = compareMode === 'last_month';
  const compareAi = useCompareAi({
    token,
    topic: kind,
    period,
    active: showCompare && compareLoaded && Boolean(data),
  });

  const filteredAreas = useMemo(() => {
    if (!data) {
      return [];
    }
    let rows = data.areas.filter(row => row.total > 0);
    if (stateFilterId != null) {
      rows = rows.filter(row => row.stateId === stateFilterId);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        row =>
          row.name.toLowerCase().includes(q) ||
          row.stateName.toLowerCase().includes(q),
      );
    }
    const sorted = [...rows];
    if (sortKey === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => b.total - a.total || b.prevTotal - a.prevTotal);
    }
    return sorted;
  }, [data, search, sortKey, stateFilterId]);

  const filteredCustomers = useMemo(() => {
    if (!data) {
      return [];
    }
    let rows = data.customers.filter(row => row.total > 0);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(row => row.name.toLowerCase().includes(q));
    }
    const sorted = [...rows];
    if (sortKey === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => b.total - a.total || b.prevTotal - a.prevTotal);
    }
    return sorted;
  }, [data, search, sortKey]);

  const currentChartLimit = useMemo(() => {
    if (kind === 'customers') {
      return showCompare ? CUSTOMER_COMPARE_LIMIT : CUSTOMER_CHART_LIMIT;
    }
    if (showCompare) {
      return AREA_COMPARE_LIMIT;
    }
    return stateFilterId == null ? AREA_NATIONWIDE_CHART_LIMIT : 50;
  }, [kind, showCompare, stateFilterId]);

  const currentChartItems = useMemo(() => {
    if (kind === 'customers') {
      return filteredCustomers.slice(0, currentChartLimit).map(row => ({
        id: row.id,
        label: row.name,
        value: row.total,
      }));
    }
    return [...filteredAreas]
      .sort((a, b) => b.total - a.total)
      .slice(0, currentChartLimit)
      .map(row => ({
        id: row.key,
        label: row.name,
        value: row.total,
      }));
  }, [currentChartLimit, filteredAreas, filteredCustomers, kind]);

  const prevChartItems = useMemo(() => {
    const limit =
      kind === 'customers' ? CUSTOMER_COMPARE_LIMIT : AREA_COMPARE_LIMIT;
    if (kind === 'customers') {
      return [...filteredCustomers]
        .filter(row => row.prevTotal > 0)
        .sort((a, b) => b.prevTotal - a.prevTotal)
        .slice(0, limit)
        .map(row => ({
          id: `prev-${row.id}`,
          label: row.name,
          value: row.prevTotal,
        }));
    }
    return [...filteredAreas]
      .filter(row => row.prevTotal > 0)
      .sort((a, b) => b.prevTotal - a.prevTotal)
      .slice(0, limit)
      .map(row => ({
        id: `prev-${row.key}`,
        label: row.name,
        value: row.prevTotal,
      }));
  }, [filteredAreas, filteredCustomers, kind]);

  const selectedStateName =
    stateFilterId == null
      ? 'All Myanmar'
      : (data?.states.find(s => s.id === stateFilterId)?.name ?? 'State');

  const currentChartHint =
    kind === 'customers'
      ? `Top ${currentChartLimit} · ${selectedPeriodLabel}`
      : stateFilterId == null
        ? `Top ${currentChartLimit} nationwide · ${selectedPeriodLabel}`
        : showCompare
          ? `${selectedStateName} · top ${currentChartLimit} · ${selectedPeriodLabel}`
          : `${selectedStateName} townships · ${selectedPeriodLabel}`;

  const prevChartHint =
    kind === 'customers'
      ? `Top ${CUSTOMER_COMPARE_LIMIT} · Last month`
      : stateFilterId == null
        ? `Top ${AREA_COMPARE_LIMIT} nationwide · Last month`
        : `${selectedStateName} · top ${AREA_COMPARE_LIMIT} · Last month`;

  const emptyCurrent =
    kind === 'customers'
      ? 'No customer purchases in this period.'
      : 'No area sales in this period.';
  const emptyPrev =
    kind === 'customers'
      ? 'No customer purchases last month.'
      : 'No area sales last month.';

  return (
    <View style={[styles.container, { backgroundColor: detail.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isMobile ? styles.padMobile : styles.padDesktop,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View>
            <Text style={[styles.pageTitle, { color: detail.onSurface }]}>
              {title}
            </Text>
            <Text style={{ color: detail.label, marginTop: 2 }}>
              All figures for{' '}
              <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>
                {selectedPeriodLabel}
              </Text>
            </Text>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" />
            </View>
          ) : error ? (
            <Text style={{ color: theme.colors.error, paddingVertical: 12 }}>
              {error}
            </Text>
          ) : (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: detail.surface,
                  borderColor: detail.border,
                  shadowColor: detail.shadow,
                },
              ]}>
              <View style={styles.toolbar}>
                {kind === 'areas' ? (
                  <Menu
                    visible={stateMenuOpen}
                    onDismiss={() => setStateMenuOpen(false)}
                    anchor={
                      <Pressable
                        onPress={() => setStateMenuOpen(true)}
                        style={[styles.menuBtn, { borderColor: detail.border }]}>
                        <Text
                          style={{ color: detail.onSurface, fontWeight: '700' }}
                          numberOfLines={1}>
                          {selectedStateName}
                        </Text>
                      </Pressable>
                    }>
                    <Menu.Item
                      onPress={() => {
                        setStateFilterId(null);
                        setStateMenuOpen(false);
                      }}
                      title="All Myanmar"
                    />
                    {(data?.states ?? []).map(state => (
                      <Menu.Item
                        key={state.id}
                        onPress={() => {
                          setStateFilterId(state.id);
                          setStateMenuOpen(false);
                        }}
                        title={state.name}
                      />
                    ))}
                  </Menu>
                ) : null}

                <Menu
                  visible={compareMenuOpen}
                  onDismiss={() => setCompareMenuOpen(false)}
                  anchor={
                    <Pressable
                      onPress={() => setCompareMenuOpen(true)}
                      style={[styles.menuBtn, { borderColor: detail.border }]}>
                      <Text
                        style={{ color: detail.onSurface, fontWeight: '700' }}
                        numberOfLines={1}>
                        Compare: {showCompare ? 'Last month' : 'Off'}
                      </Text>
                    </Pressable>
                  }>
                  <Menu.Item
                    onPress={() => {
                      setCompareMode('off');
                      setCompareMenuOpen(false);
                    }}
                    title="Off"
                  />
                  <Menu.Item
                    onPress={() => {
                      setCompareMode('last_month');
                      setCompareMenuOpen(false);
                    }}
                    title="Last month"
                  />
                </Menu>
              </View>

              <Text style={[styles.hint, { color: detail.label }]}>
                {currentChartHint}
              </Text>
              <VerticalBarChart
                items={currentChartItems}
                emptyLabel={emptyCurrent}
                formatValue={formatMoney}
                maxBars={currentChartLimit}
              />

              {showCompare ? (
                <>
                  <Text style={[styles.hint, { color: detail.label }]}>
                    {prevChartHint}
                  </Text>
                  <VerticalBarChart
                    items={prevChartItems}
                    emptyLabel={emptyPrev}
                    formatValue={formatMoney}
                    barColor="#94A3B8"
                    maxBars={
                      kind === 'customers'
                        ? CUSTOMER_COMPARE_LIMIT
                        : AREA_COMPARE_LIMIT
                    }
                  />
                  {compareAi.show ? (
                    <CompareAiPanel
                      generating={compareAi.generating}
                      error={compareAi.error}
                      pack={compareAi.pack}
                      onGenerate={() => void compareAi.run()}
                    />
                  ) : null}
                </>
              ) : null}

              <Text style={[styles.tableTitle, { color: detail.onSurface }]}>
                Full list
              </Text>

              <TextInput
                mode="outlined"
                dense
                placeholder={
                  kind === 'customers' ? 'Search customers' : 'Search areas'
                }
                value={search}
                onChangeText={setSearch}
                style={styles.search}
              />

              <View style={styles.sortRow}>
                <Pressable onPress={() => setSortKey('total')} hitSlop={6}>
                  <Text
                    style={{
                      color:
                        sortKey === 'total'
                          ? theme.colors.primary
                          : detail.label,
                      fontWeight: '700',
                      fontSize: 12,
                    }}>
                    Sort: Total
                  </Text>
                </Pressable>
                <Pressable onPress={() => setSortKey('name')} hitSlop={6}>
                  <Text
                    style={{
                      color:
                        sortKey === 'name'
                          ? theme.colors.primary
                          : detail.label,
                      fontWeight: '700',
                      fontSize: 12,
                    }}>
                    Name
                  </Text>
                </Pressable>
              </View>

              <View style={styles.tableHeader}>
                <Text
                  style={[styles.th, styles.colRank, { color: detail.label }]}>
                  #
                </Text>
                <Text
                  style={[styles.th, styles.colName, { color: detail.label }]}>
                  {kind === 'customers' ? 'CUSTOMER' : 'AREA'}
                </Text>
                {kind === 'areas' ? (
                  <Text
                    style={[
                      styles.th,
                      styles.colState,
                      { color: detail.label },
                    ]}>
                    STATE
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.th,
                      styles.colOrders,
                      { color: detail.label },
                    ]}>
                    ORDERS
                  </Text>
                )}
                <Text
                  style={[styles.th, styles.colAmount, { color: detail.label }]}>
                  TOTAL
                </Text>
                {showCompare ? (
                  <Text
                    style={[
                      styles.th,
                      styles.colAmount,
                      { color: detail.label },
                    ]}>
                    LAST MO
                  </Text>
                ) : null}
              </View>

              {kind === 'customers' ? (
                filteredCustomers.length === 0 ? (
                  <Text style={{ color: detail.label, paddingVertical: 12 }}>
                    No customers match.
                  </Text>
                ) : (
                  filteredCustomers.map((row, index) => (
                    <View
                      key={row.id}
                      style={[
                        styles.tableRow,
                        { borderBottomColor: detail.border },
                      ]}>
                      <Text
                        style={[
                          styles.td,
                          styles.colRank,
                          { color: detail.label },
                        ]}>
                        {index + 1}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          styles.colName,
                          { color: detail.onSurface },
                        ]}
                        numberOfLines={2}>
                        {row.name}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          styles.colOrders,
                          { color: detail.label },
                        ]}>
                        {row.orders}
                      </Text>
                      <Text
                        style={[
                          styles.td,
                          styles.colAmount,
                          { color: detail.onSurface },
                        ]}
                        numberOfLines={1}>
                        {formatFullMoney(row.total)}
                      </Text>
                      {showCompare ? (
                        <Text
                          style={[
                            styles.td,
                            styles.colAmount,
                            { color: detail.label },
                          ]}
                          numberOfLines={1}>
                          {formatFullMoney(row.prevTotal)}
                        </Text>
                      ) : null}
                    </View>
                  ))
                )
              ) : filteredAreas.length === 0 ? (
                <Text style={{ color: detail.label, paddingVertical: 12 }}>
                  No areas match.
                </Text>
              ) : (
                filteredAreas.map((row, index) => (
                  <View
                    key={row.key}
                    style={[
                      styles.tableRow,
                      { borderBottomColor: detail.border },
                    ]}>
                    <Text
                      style={[
                        styles.td,
                        styles.colRank,
                        { color: detail.label },
                      ]}>
                      {index + 1}
                    </Text>
                    <Text
                      style={[
                        styles.td,
                        styles.colName,
                        { color: detail.onSurface },
                      ]}
                      numberOfLines={2}>
                      {row.name}
                    </Text>
                    <Text
                      style={[
                        styles.td,
                        styles.colState,
                        { color: detail.label },
                      ]}
                      numberOfLines={1}>
                      {row.stateName}
                    </Text>
                    <Text
                      style={[
                        styles.td,
                        styles.colAmount,
                        { color: detail.onSurface },
                      ]}
                      numberOfLines={1}>
                      {formatFullMoney(row.total)}
                    </Text>
                    {showCompare ? (
                      <Text
                        style={[
                          styles.td,
                          styles.colAmount,
                          { color: detail.label },
                        ]}
                        numberOfLines={1}>
                        {formatFullMoney(row.prevTotal)}
                      </Text>
                    ) : null}
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1 },
  padMobile: { padding: 12, paddingBottom: 32 },
  padDesktop: { padding: 20, paddingBottom: 40 },
  page: {
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    gap: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  center: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  menuBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 220,
  },
  hint: {
    fontSize: 12,
    fontWeight: '600',
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 8,
  },
  search: {
    backgroundColor: 'transparent',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
  },
  td: {
    fontSize: 12,
    fontWeight: '600',
  },
  colRank: {
    width: 28,
  },
  colName: {
    flex: 1.4,
    minWidth: 0,
  },
  colState: {
    flex: 1,
    minWidth: 0,
  },
  colOrders: {
    width: 52,
    textAlign: 'right',
  },
  colAmount: {
    flex: 1,
    textAlign: 'right',
    minWidth: 0,
  },
});
