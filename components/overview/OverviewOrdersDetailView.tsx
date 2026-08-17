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
import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { useAuth } from '@/contexts/auth-context';
import { useSearch } from '@/contexts/search-context';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchOverviewOrders } from '@/services/insights';
import {
  OverviewCompareMode,
  OverviewOrderType,
  OverviewOrders,
  OverviewPeriod,
  OverviewPeriodOrder,
} from '@/types/overview';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

type OverviewOrdersDetailViewProps = {
  type: OverviewOrderType;
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

const CHART_LIMIT = 15;
const COMPARE_LIMIT = 10;

function toChartItems(rows: OverviewPeriodOrder[], limit: number) {
  return [...rows]
    .filter(row => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map(row => ({
      id: row.id,
      label: row.number || row.partner || 'Order',
      value: row.total,
    }));
}

export function OverviewOrdersDetailView({
  type,
  period,
}: OverviewOrdersDetailViewProps) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { setDetailHeader } = useSearch();
  const { width } = useResponsive();
  const isMobile = width < 900;
  const token = session?.token ?? '';
  const selectedPeriodLabel = periodLabel(period);
  const isPurchase = type === 'purchase';
  const title = isPurchase ? 'Purchase orders' : 'Sale orders';
  const partnerLabel = isPurchase ? 'VENDOR' : 'CUSTOMER';
  const modulePath = isPurchase ? '/purchase-orders' : '/sale-orders';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewOrders | null>(null);
  const [compareMode, setCompareMode] = useState<OverviewCompareMode>('off');
  const [compareMenuOpen, setCompareMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'total' | 'date' | 'partner'>('total');

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/overview');
  }, [router]);

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
    setSearch('');
    setSortKey('total');

    void (async () => {
      try {
        const orders = await fetchOverviewOrders(token, period, type);
        if (!cancelled) {
          setData(orders);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load orders.',
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
  }, [token, period, type]);

  const showCompare = compareMode === 'last_month';
  const chartLimit = showCompare ? COMPARE_LIMIT : CHART_LIMIT;

  const filteredOrders = useMemo(() => {
    if (!data) {
      return [];
    }
    let rows = data.orders.filter(row => row.total > 0);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        row =>
          row.number.toLowerCase().includes(q) ||
          row.partner.toLowerCase().includes(q),
      );
    }
    const sorted = [...rows];
    if (sortKey === 'partner') {
      sorted.sort((a, b) => a.partner.localeCompare(b.partner));
    } else if (sortKey === 'date') {
      sorted.sort((a, b) => b.orderDate.localeCompare(a.orderDate));
    } else {
      sorted.sort((a, b) => b.total - a.total);
    }
    return sorted;
  }, [data, search, sortKey]);

  const currentChartItems = useMemo(
    () => toChartItems(data?.orders ?? [], chartLimit),
    [chartLimit, data?.orders],
  );
  const prevChartItems = useMemo(
    () => toChartItems(data?.prevOrders ?? [], COMPARE_LIMIT),
    [data?.prevOrders],
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
              {title}
            </Text>
            <Text style={{ color: detail.label, marginTop: 2 }}>
              Confirmed orders for{' '}
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
                Top {chartLimit} by amount · {selectedPeriodLabel}
              </Text>
              <VerticalBarChart
                items={currentChartItems}
                emptyLabel={
                  isPurchase
                    ? 'No purchase orders in this period.'
                    : 'No sale orders in this period.'
                }
                formatValue={formatMoney}
                maxBars={chartLimit}
              />

              {showCompare ? (
                <>
                  <Text style={[styles.hint, { color: detail.label }]}>
                    Top {COMPARE_LIMIT} by amount · Last month
                  </Text>
                  <VerticalBarChart
                    items={prevChartItems}
                    emptyLabel={
                      isPurchase
                        ? 'No purchase orders last month.'
                        : 'No sale orders last month.'
                    }
                    formatValue={formatMoney}
                    barColor="#94A3B8"
                    maxBars={COMPARE_LIMIT}
                  />
                </>
              ) : null}

              <Text style={[styles.tableTitle, { color: detail.onSurface }]}>
                Full list
              </Text>

              <TextInput
                mode="outlined"
                dense
                placeholder={
                  isPurchase
                    ? 'Search vendors or order numbers'
                    : 'Search customers or order numbers'
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
                <Pressable onPress={() => setSortKey('date')} hitSlop={6}>
                  <Text
                    style={{
                      color:
                        sortKey === 'date'
                          ? theme.colors.primary
                          : detail.label,
                      fontWeight: '700',
                      fontSize: 12,
                    }}>
                    Date
                  </Text>
                </Pressable>
                <Pressable onPress={() => setSortKey('partner')} hitSlop={6}>
                  <Text
                    style={{
                      color:
                        sortKey === 'partner'
                          ? theme.colors.primary
                          : detail.label,
                      fontWeight: '700',
                      fontSize: 12,
                    }}>
                    {isPurchase ? 'Vendor' : 'Customer'}
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
                  {partnerLabel}
                </Text>
                <Text
                  style={[styles.th, styles.colOrder, { color: detail.label }]}>
                  ORDER
                </Text>
                <Text
                  style={[styles.th, styles.colAmount, { color: detail.label }]}>
                  TOTAL
                </Text>
                <Text
                  style={[styles.th, styles.colDate, { color: detail.label }]}>
                  DATE
                </Text>
              </View>

              {filteredOrders.length === 0 ? (
                <Text style={{ color: detail.label, paddingVertical: 12 }}>
                  No orders match.
                </Text>
              ) : (
                filteredOrders.map((row, index) => (
                  <Pressable
                    key={row.id}
                    onPress={() => router.push(modulePath)}
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
                    <CustomerNameText
                      size="body"
                      style={[
                        styles.td,
                        styles.colName,
                        { color: detail.onSurface, fontWeight: '600' },
                      ]}
                      numberOfLines={2}>
                      {row.partner || '—'}
                    </CustomerNameText>
                    <Text
                      style={[
                        styles.td,
                        styles.colOrder,
                        { color: theme.colors.primary },
                      ]}
                      numberOfLines={1}>
                      {row.number || '—'}
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
                    <Text
                      style={[
                        styles.td,
                        styles.colDate,
                        { color: detail.label },
                      ]}
                      numberOfLines={1}>
                      {formatMyanmarDate(row.orderDate) || row.orderDate || '—'}
                    </Text>
                  </Pressable>
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
  colOrder: {
    flex: 1,
    minWidth: 0,
  },
  colAmount: {
    flex: 1,
    textAlign: 'right',
    minWidth: 0,
  },
  colDate: {
    width: 88,
    textAlign: 'right',
  },
});
