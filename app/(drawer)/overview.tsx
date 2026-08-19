import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';

import { AiSuggestionsCard } from '@/components/overview/AiSuggestionsCard';
import { OverviewChatPanel } from '@/components/overview/OverviewChatPanel';
import { HorizontalBarChart } from '@/components/overview/HorizontalBarChart';
import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { useAuth } from '@/contexts/auth-context';
import { useModuleSearch } from '@/contexts/search-context';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchAiSuggestions,
  fetchOverviewSummary,
  generateAiSuggestions,
} from '@/services/insights';
import {
  ENABLE_APP_INSTALL_CALL_LIST,
  fetchAppUserListSummary,
  type AppUserListRange,
} from '@/features/app-install';
import {
  AiSuggestionsStatus,
  OverviewDemandStockProduct,
  OverviewPeriod,
  OverviewProductRank,
  OverviewStockProduct,
  OverviewSummary,
} from '@/types/overview';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  if (safe >= 1_000_000) {
    return `${(safe / 1_000_000).toFixed(1)}M`;
  }
  if (safe >= 10_000) {
    return `${Math.round(safe / 1000)}k`;
  }
  return safe.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
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

function TrendBadge({ trend }: { trend: number }) {
  if (!Number.isFinite(trend) || trend === 0) {
    return (
      <Text style={[styles.trend, { color: '#64748B' }]}>0%</Text>
    );
  }
  const up = trend > 0;
  return (
    <View style={styles.trendRow}>
      <Icon
        source={up ? 'arrow-up' : 'arrow-down'}
        size={14}
        color={up ? '#2FB344' : '#D63939'}
      />
      <Text style={[styles.trend, { color: up ? '#2FB344' : '#D63939' }]}>
        {up ? '+' : ''}
        {trend}%
      </Text>
    </View>
  );
}

function KpiCard({
  label,
  value,
  trend,
  suffix,
}: {
  label: string;
  value: string;
  trend: number;
  suffix?: string;
}) {
  const detail = useDetailTheme();

  return (
    <View
      style={[
        styles.kpiCard,
        {
          backgroundColor: detail.surface,
          borderColor: detail.border,
          shadowColor: detail.shadow,
        },
      ]}>
      <View style={styles.kpiTop}>
        <Text style={[styles.kpiValue, { color: detail.onSurface }]}>
          {value}
          {suffix ? (
            <Text style={[styles.kpiSuffix, { color: detail.label }]}>
              {' '}
              {suffix}
            </Text>
          ) : null}
        </Text>
        <TrendBadge trend={trend} />
      </View>
      <Text style={[styles.kpiLabel, { color: detail.label }]}>{label}</Text>
    </View>
  );
}

function SurfaceCard({
  title,
  children,
  style,
  actionLabel,
  onAction,
}: {
  title: string;
  children: ReactNode;
  style?: object;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const detail = useDetailTheme();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: detail.surface,
          borderColor: detail.border,
          shadowColor: detail.shadow,
        },
        style,
      ]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: detail.onSurface, flex: 1 }]}>
          {title}
        </Text>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}>
            <Text style={[styles.cardAction, { color: theme.colors.primary }]}>
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ProductRankList({
  items,
  emptyLabel,
}: {
  items: OverviewProductRank[];
  emptyLabel: string;
}) {
  const detail = useDetailTheme();
  const theme = useTheme();

  if (items.length === 0) {
    return (
      <Text style={{ color: detail.label, paddingVertical: 8 }}>{emptyLabel}</Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {items.map((item, index) => (
        <View key={item.id} style={styles.productRow}>
          <View
            style={[
              styles.rankBadge,
              { backgroundColor: theme.colors.primaryContainer },
            ]}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>
              {index + 1}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text
              style={[styles.productName, { color: detail.onSurface }]}
              numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={{ color: detail.label, fontSize: 12 }}>
              Qty {item.qty.toLocaleString()}
            </Text>
          </View>
          <Text style={[styles.productRevenue, { color: theme.colors.primary }]}>
            {formatFullMoney(item.revenue)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function LowestOnHandList({
  items,
}: {
  items: OverviewStockProduct[];
}) {
  const detail = useDetailTheme();
  const theme = useTheme();

  if (items.length === 0) {
    return (
      <Text style={{ color: detail.label, paddingVertical: 8 }}>
        No stockable products found.
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {items.map((item, index) => (
        <View key={item.id} style={styles.productRow}>
          <View
            style={[
              styles.rankBadge,
              { backgroundColor: theme.colors.errorContainer },
            ]}>
            <Text style={{ color: theme.colors.error, fontWeight: '800' }}>
              {index + 1}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text
              style={[styles.productName, { color: detail.onSurface }]}
              numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={{ color: detail.label, fontSize: 12 }}>
              On hand
            </Text>
          </View>
          <Text style={[styles.productRevenue, { color: theme.colors.error }]}>
            {item.onHand.toLocaleString()}
          </Text>
        </View>
      ))}
    </View>
  );
}

function HighestDemandStockList({
  items,
}: {
  items: OverviewDemandStockProduct[];
}) {
  const detail = useDetailTheme();
  const theme = useTheme();

  if (items.length === 0) {
    return (
      <Text style={{ color: detail.label, paddingVertical: 8 }}>
        No product demand in this period.
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {items.map((item, index) => (
        <View key={item.id} style={styles.productRow}>
          <View
            style={[
              styles.rankBadge,
              { backgroundColor: theme.colors.primaryContainer },
            ]}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>
              {index + 1}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text
              style={[styles.productName, { color: detail.onSurface }]}
              numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={{ color: detail.label, fontSize: 12 }}>
              Demand {item.demandQty.toLocaleString()}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={[styles.productRevenue, { color: theme.colors.primary }]}>
              {item.onHand.toLocaleString()}
            </Text>
            <Text style={{ color: detail.label, fontSize: 11, fontWeight: '600' }}>
              on hand
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const PERIODS: { key: OverviewPeriod; label: string }[] = [
  { key: 'day', label: 'Today' },
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
];

export default function OverviewScreen() {
  const theme = useTheme();
  const detail = useDetailTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const router = useRouter();
  const isMobile = width < 900;

  useModuleSearch('', false);

  const [period, setPeriod] = useState<OverviewPeriod>('month');
  const [data, setData] = useState<OverviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [aiStatus, setAiStatus] = useState<AiSuggestionsStatus | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [appUserListCount, setAppUserListCount] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  const loadAiSuggestions = useCallback(async () => {
    if (!session?.token) {
      return null;
    }
    try {
      const status = await fetchAiSuggestions(session.token);
      setAiStatus(status);
      setAiError('');
      return status;
    } catch {
      // Optional feature — don't block Overview if AI endpoint fails.
      return null;
    }
  }, [session?.token]);

  const runGenerateSuggestions = useCallback(
    async (slot?: AiSuggestionsStatus['suggestedSlot']) => {
      if (!session?.token || aiGenerating) {
        return;
      }
      setAiGenerating(true);
      setAiError('');
      try {
        const nextSlot = slot ?? aiStatus?.suggestedSlot ?? 'manual';
        const pack = await generateAiSuggestions(session.token, nextSlot);
        setAiStatus(prev =>
          prev
            ? {
                ...prev,
                latest: pack,
                shouldGenerate: false,
              }
            : {
                enabled: true,
                configured: true,
                latest: pack,
                shouldGenerate: false,
                suggestedSlot: nextSlot,
              },
        );
      } catch (err) {
        setAiError(
          err instanceof Error ? err.message : 'Failed to generate suggestions.',
        );
      } finally {
        setAiGenerating(false);
      }
    },
    [session?.token, aiGenerating, aiStatus?.suggestedSlot],
  );

  const appUserListRange: AppUserListRange =
    period === 'day' ? 'today' : period === 'week' ? 'week' : 'month';

  const load = useCallback(async () => {
    if (!session?.token) {
      return;
    }
    setError('');
    setLoading(true);
    try {
      const [summary, _aiStatus, appCount] = await Promise.all([
        fetchOverviewSummary(session.token, period),
        loadAiSuggestions(),
        (async () => {
          if (!ENABLE_APP_INSTALL_CALL_LIST) {
            return 0;
          }
          return fetchAppUserListSummary(session.token, appUserListRange);
        })(),
      ]);
      setData(summary);
      setAppUserListCount(appCount);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load overview.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.token, period, loadAiSuggestions, appUserListRange]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const selectPeriod = (next: OverviewPeriod) => {
    if (next === period || loading) {
      return;
    }
    setPeriod(next);
  };

  const selectedPeriodLabel = periodLabel(period);

  const customerBarItems = useMemo(
    () =>
      (data?.topSpendingCustomers ?? []).map(item => ({
        id: item.id,
        label: item.name || 'Customer',
        value: item.total,
      })),
    [data?.topSpendingCustomers],
  );

  const areaBarItems = useMemo(
    () =>
      (data?.areaChart.series ?? []).map((item, index) => ({
        id: `${item.name}-${index}`,
        label: item.name || 'Area',
        value: item.total,
      })),
    [data?.areaChart.series],
  );

  const kpiItems = useMemo(() => {
    if (!data) {
      return [];
    }
    const k = data.kpis;
    const buying = k.buyingCustomers ?? k.totalCustomers;
    const quotations = k.quotations ?? k.openQuotations;
    return [
      {
        key: 'sale',
        label: 'Total sale amount',
        value: formatMoney(k.saleAmount.value),
        trend: k.saleAmount.trend,
        suffix: 'MMK',
      },
      {
        key: 'orders',
        label: 'Sale orders',
        value: String(k.confirmedOrders.value),
        trend: k.confirmedOrders.trend,
      },
      {
        key: 'purchaseAmount',
        label: 'Purchase amount',
        value: formatMoney(k.purchaseAmount?.value ?? 0),
        trend: k.purchaseAmount?.trend ?? 0,
        suffix: 'MMK',
      },
      {
        key: 'purchaseOrders',
        label: 'Purchase orders',
        value: String(k.purchaseOrders?.value ?? 0),
        trend: k.purchaseOrders?.trend ?? 0,
      },
      {
        key: 'items',
        label: 'Items sold',
        value: String(Math.round(k.itemsSold?.value ?? 0)),
        trend: k.itemsSold?.trend ?? 0,
      },
      {
        key: 'customers',
        label: 'Buying customers',
        value: String(buying?.value ?? 0),
        trend: buying?.trend ?? 0,
      },
      {
        key: 'quotes',
        label: 'Quotations',
        value: String(quotations?.value ?? 0),
        trend: quotations?.trend ?? 0,
      },
      {
        key: 'aov',
        label: 'Avg order value',
        value: formatMoney(k.avgOrderValue.value),
        trend: k.avgOrderValue.trend,
        suffix: 'MMK',
      },
    ];
  }, [data]);

  if (loading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: detail.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, color: detail.label }}>
          Loading {selectedPeriodLabel.toLowerCase()} overview...
        </Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.center, { backgroundColor: detail.background }]}>
        <Text variant="titleMedium" style={{ fontWeight: '700', marginBottom: 8 }}>
          Could not load overview
        </Text>
        <Text style={{ color: theme.colors.error, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: detail.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isMobile ? styles.padMobile : styles.padDesktop,
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 180 }}>
              <Text style={[styles.pageTitle, { color: detail.onSurface }]}>
                Overview
              </Text>
              <Text style={{ color: detail.label, marginTop: 2 }}>
                All figures for{' '}
                <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>
                  {selectedPeriodLabel}
                </Text>
              </Text>
            </View>
            <View style={styles.periodBlock}>
              <Text style={[styles.periodCaption, { color: detail.label }]}>
                PERIOD
              </Text>
              <View
                style={[
                  styles.periodTabs,
                  { backgroundColor: detail.panelBg, borderColor: detail.border },
                ]}>
                {PERIODS.map(item => {
                  const active = item.key === period;
                  return (
                    <Pressable
                      key={item.key}
                      disabled={loading}
                      onPress={() => selectPeriod(item.key)}
                      accessibilityState={{ selected: active, disabled: loading }}
                      style={[
                        styles.periodTab,
                        active && {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.primary,
                        },
                        !active && {
                          borderColor: 'transparent',
                        },
                        loading && !active && { opacity: 0.55 },
                      ]}>
                      {active ? (
                        <Icon source="check" size={14} color="#fff" />
                      ) : null}
                      <Text
                        style={{
                          color: active ? '#fff' : detail.onSurface,
                          fontWeight: '800',
                          fontSize: 13,
                        }}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {loading ? (
            <View
              style={[
                styles.loadingBanner,
                {
                  backgroundColor: theme.colors.primaryContainer,
                  borderColor: theme.colors.primary,
                },
              ]}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                Loading {selectedPeriodLabel.toLowerCase()}…
              </Text>
            </View>
          ) : null}

          {error ? (
            <Text style={{ color: theme.colors.error }}>{error}</Text>
          ) : null}

          <AiSuggestionsCard
            status={aiStatus}
            generating={aiGenerating}
            error={aiError}
            onGenerate={() =>
              void runGenerateSuggestions(
                period === 'month'
                  ? 'monthly'
                  : (aiStatus?.suggestedSlot ?? 'manual'),
              )
            }
          />

          <View
            style={[styles.kpiGrid, isMobile && styles.kpiGridMobile]}
            pointerEvents={loading ? 'none' : 'auto'}>
            {kpiItems.map(item => (
              <View
                key={item.key}
                style={[
                  styles.kpiWrap,
                  isMobile && styles.kpiWrapMobile,
                  loading && styles.dimmed,
                ]}>
                <KpiCard
                  label={item.label}
                  value={item.value}
                  trend={item.trend}
                  suffix={item.suffix}
                />
              </View>
            ))}
          </View>

          <View
            style={[
              styles.mainGrid,
              isMobile && styles.stack,
              loading && styles.dimmed,
            ]}
            pointerEvents={loading ? 'none' : 'auto'}>
            <View style={styles.mainCol}>
              <SurfaceCard
                title="Most spending customers"
                actionLabel="View detail"
                onAction={() =>
                  router.push({
                    pathname: '/overview-detail',
                    params: { kind: 'customers', period },
                  })
                }>
                <Text style={[styles.cardHint, { color: detail.label }]}>
                  Top customers by purchase total · {selectedPeriodLabel}
                </Text>
                <HorizontalBarChart
                  items={customerBarItems}
                  emptyLabel="No customer purchases in this period."
                  formatValue={formatMoney}
                />
              </SurfaceCard>

              <SurfaceCard
                title={`Sale orders · ${data?.kpis.confirmedOrders.value ?? 0}`}
                actionLabel="View detail"
                onAction={() =>
                  router.push({
                    pathname: '/overview-sales',
                    params: { period },
                  })
                }>
                <Text style={[styles.cardHint, { color: detail.label }]}>
                  Confirmed orders in {selectedPeriodLabel.toLowerCase()}
                </Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.colCustomer, { color: detail.label }]}>
                    CUSTOMER
                  </Text>
                  <Text style={[styles.th, styles.colOrder, { color: detail.label }]}>
                    ORDER
                  </Text>
                  <Text style={[styles.th, styles.colAmount, { color: detail.label }]}>
                    AMOUNT
                  </Text>
                  <Text style={[styles.th, styles.colDate, { color: detail.label }]}>
                    DATE
                  </Text>
                </View>
                {(data?.recentOrders ?? []).length === 0 ? (
                  <Text style={{ color: detail.label, paddingVertical: 12 }}>
                    No confirmed orders in this period.
                  </Text>
                ) : (
                  data?.recentOrders.map(order => (
                    <Pressable
                      key={order.id}
                      onPress={() =>
                        router.push({
                          pathname: '/sale-orders',
                          params: { detailId: order.id },
                        })
                      }
                      style={[
                        styles.tableRow,
                        { borderBottomColor: detail.border },
                      ]}>
                      <CustomerNameText
                        size="body"
                        style={[styles.colCustomer, { fontWeight: '600' }]}
                        numberOfLines={1}>
                        {order.customer || '—'}
                      </CustomerNameText>
                      <Text
                        style={[styles.td, styles.colOrder, { color: theme.colors.primary }]}
                        numberOfLines={1}>
                        {order.number}
                      </Text>
                      <Text
                        style={[styles.td, styles.colAmount, { color: detail.onSurface }]}
                        numberOfLines={1}>
                        {formatFullMoney(order.total)}
                      </Text>
                      <Text
                        style={[styles.td, styles.colDate, { color: detail.label }]}
                        numberOfLines={1}>
                        {formatMyanmarDate(order.orderDate) || order.orderDate || '—'}
                      </Text>
                    </Pressable>
                  ))
                )}
              </SurfaceCard>

              <SurfaceCard
                title={`Purchase orders · ${data?.kpis.purchaseOrders?.value ?? 0}`}
                actionLabel="View detail"
                onAction={() =>
                  router.push({
                    pathname: '/overview-purchases',
                    params: { period },
                  })
                }>
                <Text style={[styles.cardHint, { color: detail.label }]}>
                  Confirmed purchases in {selectedPeriodLabel.toLowerCase()}
                </Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.colCustomer, { color: detail.label }]}>
                    VENDOR
                  </Text>
                  <Text style={[styles.th, styles.colOrder, { color: detail.label }]}>
                    ORDER
                  </Text>
                  <Text style={[styles.th, styles.colAmount, { color: detail.label }]}>
                    AMOUNT
                  </Text>
                  <Text style={[styles.th, styles.colDate, { color: detail.label }]}>
                    DATE
                  </Text>
                </View>
                {(data?.recentPurchaseOrders ?? []).length === 0 ? (
                  <Text style={{ color: detail.label, paddingVertical: 12 }}>
                    No confirmed purchase orders in this period.
                  </Text>
                ) : (
                  data?.recentPurchaseOrders.map(order => (
                    <Pressable
                      key={order.id}
                      onPress={() =>
                        router.push({
                          pathname: '/purchase-orders',
                          params: { detailId: order.id },
                        })
                      }
                      style={[
                        styles.tableRow,
                        { borderBottomColor: detail.border },
                      ]}>
                      <CustomerNameText
                        size="body"
                        style={[styles.colCustomer, { fontWeight: '600' }]}
                        numberOfLines={1}>
                        {order.vendor || '—'}
                      </CustomerNameText>
                      <Text
                        style={[styles.td, styles.colOrder, { color: theme.colors.primary }]}
                        numberOfLines={1}>
                        {order.number}
                      </Text>
                      <Text
                        style={[styles.td, styles.colAmount, { color: detail.onSurface }]}
                        numberOfLines={1}>
                        {formatFullMoney(order.total)}
                      </Text>
                      <Text
                        style={[styles.td, styles.colDate, { color: detail.label }]}
                        numberOfLines={1}>
                        {formatMyanmarDate(order.orderDate) || order.orderDate || '—'}
                      </Text>
                    </Pressable>
                  ))
                )}
              </SurfaceCard>
            </View>

            <View style={styles.sideCol}>
              <SurfaceCard
                title="Top buying areas"
                actionLabel="View detail"
                onAction={() =>
                  router.push({
                    pathname: '/overview-detail',
                    params: { kind: 'areas', period },
                  })
                }>
                <Text style={[styles.cardHint, { color: detail.label }]}>
                  Top 5 areas by sale amount · {selectedPeriodLabel}
                </Text>
                <HorizontalBarChart
                  items={areaBarItems}
                  emptyLabel="No area sales in this period."
                  formatValue={formatMoney}
                />
              </SurfaceCard>
              <SurfaceCard title="Top products">
                <ProductRankList
                  items={data?.topProducts ?? []}
                  emptyLabel="No product sales in this period."
                />
              </SurfaceCard>
              <SurfaceCard title="Lowest on hand">
                <Text style={[styles.cardHint, { color: detail.label }]}>
                  Top 3 products with the lowest stock
                </Text>
                <LowestOnHandList items={data?.lowestOnHandProducts ?? []} />
              </SurfaceCard>
              <SurfaceCard
                title="Highest demand"
                actionLabel="View detail"
                onAction={() =>
                  router.push({
                    pathname: '/overview-demand',
                    params: { period },
                  })
                }>
                <Text style={[styles.cardHint, { color: detail.label }]}>
                  Top 3 by sold qty · showing on hand · {selectedPeriodLabel}
                </Text>
                <HighestDemandStockList
                  items={data?.highestDemandProducts ?? []}
                />
              </SurfaceCard>
              {ENABLE_APP_INSTALL_CALL_LIST ? (
                <SurfaceCard
                  title={`Installed app users · ${appUserListCount.toLocaleString()}`}
                  actionLabel="View detail"
                  onAction={() =>
                    router.push({
                      pathname: '/app-user-list' as any,
                      params: { initialRange: appUserListRange },
                    })
                  }>
                  <Text style={[styles.cardHint, { color: detail.label }]}>
                    Installed users for {selectedPeriodLabel}
                  </Text>
                </SurfaceCard>
              ) : null}
              <SurfaceCard title="Least products">
                <ProductRankList
                  items={data?.bottomProducts ?? []}
                  emptyLabel="Need more than 3 sold products to rank least sellers."
                />
              </SurfaceCard>
            </View>
          </View>
        </View>
      </ScrollView>
      <OverviewChatPanel
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        token={session?.token ?? ''}
        period={period}
        periodLabel={selectedPeriodLabel}
      />
      <Pressable
        onPress={() => setChatOpen(open => !open)}
        accessibilityRole="button"
        accessibilityLabel={chatOpen ? 'Close chat' : 'Open chat'}
        style={[
          styles.fab,
          {
            backgroundColor: '#111',
            shadowColor: detail.shadow,
          },
          Platform.OS === 'web' ? ({ position: 'fixed' } as const) : null,
        ]}>
        <Image
          source={require('@/assets/images/overview-ai-fab.png')}
          style={styles.fabImage}
          contentFit="cover"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: { flexGrow: 1 },
  padMobile: { padding: 12, paddingBottom: 96 },
  padDesktop: { padding: 20, paddingBottom: 104 },
  page: {
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  periodTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  periodBlock: {
    gap: 6,
    alignItems: 'flex-end',
  },
  periodCaption: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  periodTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dimmed: {
    opacity: 0.45,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Even 4-column rows; avoid flexGrow so the last row doesn't stretch.
    gap: 12,
  },
  kpiGridMobile: {
    gap: 10,
  },
  kpiWrap: {
    // ~4 equal columns (room for row gaps so the last row never stretches)
    width: '23.5%',
    flexGrow: 0,
    flexShrink: 0,
  },
  kpiWrapMobile: {
    width: '47.5%',
    flexGrow: 0,
    flexShrink: 0,
  },
  kpiCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
    minHeight: 96,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    flexShrink: 1,
  },
  kpiSuffix: {
    fontSize: 12,
    fontWeight: '700',
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trend: {
    fontSize: 12,
    fontWeight: '700',
  },
  mainGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stack: {
    flexDirection: 'column',
  },
  mainCol: {
    flex: 1.7,
    minWidth: 0,
    gap: 14,
  },
  sideCol: {
    flex: 1,
    minWidth: 260,
    gap: 14,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardAction: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardHint: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: -6,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
  },
  productRevenue: {
    fontSize: 13,
    fontWeight: '800',
  },
  tableHeader: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  th: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  td: {
    fontSize: 13,
    fontWeight: '600',
  },
  colCustomer: { flex: 1.4, minWidth: 0 },
  colOrder: { flex: 1, minWidth: 0 },
  colAmount: { flex: 1, minWidth: 0, textAlign: 'right' },
  colDate: { flex: 0.9, minWidth: 0, textAlign: 'right' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    elevation: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    zIndex: 1000,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : null),
  },
  fabImage: {
    width: 72,
    height: 72,
  },
});
