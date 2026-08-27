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

import { CompareAiPanel } from '@/components/overview/CompareAiPanel';
import { VerticalBarChart } from '@/components/overview/VerticalBarChart';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useSearch,
} from '@/contexts/search-context';
import { useCompareAi } from '@/hooks/use-compare-ai';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchOverviewDemand,
  fetchOverviewSixMonthExport,
} from '@/services/insights';
import { exportOverviewSixMonthExcel } from '@/utils/export-overview-six-month-excel';
import {
  OverviewCompareMode,
  OverviewDemand,
  OverviewPeriod,
} from '@/types/overview';

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

const CHART_LIMIT = 15;
const COMPARE_LIMIT = 10;

export function OverviewDemandDetailView({
  period,
}: {
  period: OverviewPeriod;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { setDetailHeader } = useSearch();
  const { width } = useResponsive();
  const isMobile = width < 900;
  const token = session?.token ?? '';
  const selectedPeriodLabel = periodLabel(period);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewDemand | null>(null);
  const [compareMode, setCompareMode] = useState<OverviewCompareMode>('off');
  const [compareMenuOpen, setCompareMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
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
    if (!token || exporting) {
      return;
    }
    setExporting(true);
    setError(null);
    try {
      const payload = await fetchOverviewSixMonthExport(token, 'products');
      const ok = exportOverviewSixMonthExcel(payload);
      if (!ok) {
        setError('Excel export is only available on web.');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to export six-month products.',
      );
    } finally {
      setExporting(false);
    }
  }, [exporting, token]);

  const headerActions = useMemo<HeaderAction[]>(
    () => [
      {
        key: 'excel-6m',
        icon: exporting ? 'loading' : 'microsoft-excel',
        onPress: () => {
          void exportSixMonth();
        },
        accessibilityLabel: 'Export six months products to Excel',
        label: exporting ? 'Exporting…' : 'Export 6 months',
      },
    ],
    [exportSixMonth, exporting],
  );

  useHeaderActions(headerActions);

  useFocusEffect(
    useCallback(() => {
      setDetailHeader({
        title: 'Highest demand',
        breadcrumbParent: 'Overview',
        onBack: goBack,
      });
      return () => setDetailHeader(null);
    }, [goBack, setDetailHeader]),
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
    setSearch('');
    setCompareLoaded(false);

    void (async () => {
      try {
        const demand = await fetchOverviewDemand(token, period, false);
        if (!cancelled) {
          setData(demand);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load demand.',
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
  }, [token, period]);

  useEffect(() => {
    if (!token || compareMode !== 'last_month' || compareLoaded) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const demand = await fetchOverviewDemand(token, period, true);
        if (!cancelled) {
          setData(demand);
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
    topic: 'demand',
    period,
    active: showCompare && compareLoaded && Boolean(data),
  });

  const filtered = useMemo(() => {
    if (!data) {
      return [];
    }
    const q = search.trim().toLowerCase();
    const rows = q
      ? data.products.filter(row => row.name.toLowerCase().includes(q))
      : data.products;
    return [...rows].sort(
      (a, b) => b.demandQty - a.demandQty || b.prevDemandQty - a.prevDemandQty,
    );
  }, [data, search]);

  const chartLimit = showCompare ? COMPARE_LIMIT : CHART_LIMIT;
  const currentChartItems = useMemo(
    () =>
      [...filtered]
        .filter(row => row.demandQty > 0)
        .slice(0, chartLimit)
        .map(row => ({
          id: row.id,
          label: row.name,
          value: row.demandQty,
        })),
    [chartLimit, filtered],
  );
  const prevChartItems = useMemo(
    () =>
      [...filtered]
        .filter(row => row.prevDemandQty > 0)
        .sort((a, b) => b.prevDemandQty - a.prevDemandQty)
        .slice(0, COMPARE_LIMIT)
        .map(row => ({
          id: `prev-${row.id}`,
          label: row.name,
          value: row.prevDemandQty,
        })),
    [filtered],
  );

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
              Highest demand
            </Text>
            <Text style={{ color: detail.label, marginTop: 2 }}>
              Sold qty for{' '}
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
                Top {chartLimit} by sold qty · {selectedPeriodLabel}
              </Text>
              <VerticalBarChart
                items={currentChartItems}
                emptyLabel="No product demand in this period."
                formatValue={value => value.toLocaleString()}
                maxBars={chartLimit}
              />

              {showCompare ? (
                <>
                  <Text style={[styles.hint, { color: detail.label }]}>
                    Top {COMPARE_LIMIT} by sold qty · Last month
                  </Text>
                  <VerticalBarChart
                    items={prevChartItems}
                    emptyLabel="No product demand last month."
                    formatValue={value => value.toLocaleString()}
                    barColor="#94A3B8"
                    maxBars={COMPARE_LIMIT}
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
                placeholder="Search products"
                value={search}
                onChangeText={setSearch}
                style={styles.search}
              />

              <View style={styles.tableHeader}>
                <Text
                  style={[styles.th, styles.colRank, { color: detail.label }]}>
                  #
                </Text>
                <Text
                  style={[styles.th, styles.colName, { color: detail.label }]}>
                  PRODUCT
                </Text>
                <Text
                  style={[styles.th, styles.colQty, { color: detail.label }]}>
                  DEMAND
                </Text>
                {showCompare ? (
                  <Text
                    style={[styles.th, styles.colQty, { color: detail.label }]}>
                    LAST MO
                  </Text>
                ) : null}
                <Text
                  style={[styles.th, styles.colQty, { color: detail.label }]}>
                  ON HAND
                </Text>
              </View>

              {filtered.length === 0 ? (
                <Text style={{ color: detail.label, paddingVertical: 12 }}>
                  No products match.
                </Text>
              ) : (
                filtered.map((row, index) => (
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
                        styles.colQty,
                        { color: detail.onSurface },
                      ]}>
                      {row.demandQty.toLocaleString()}
                    </Text>
                    {showCompare ? (
                      <Text
                        style={[
                          styles.td,
                          styles.colQty,
                          { color: detail.label },
                        ]}>
                        {row.prevDemandQty.toLocaleString()}
                      </Text>
                    ) : null}
                    <Text
                      style={[
                        styles.td,
                        styles.colQty,
                        { color: detail.label },
                      ]}>
                      {row.onHand.toLocaleString()}
                    </Text>
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
    flex: 1.6,
    minWidth: 0,
  },
  colQty: {
    flex: 0.7,
    textAlign: 'right',
    minWidth: 0,
  },
});
