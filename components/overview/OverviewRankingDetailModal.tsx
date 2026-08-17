import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Menu, Text, TextInput, useTheme } from 'react-native-paper';

import { VerticalBarChart } from '@/components/overview/VerticalBarChart';
import { DismissibleModal } from '@/components/ui/DismissibleModal';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { fetchOverviewRankings } from '@/services/insights';
import {
  OverviewCompareMode,
  OverviewPeriod,
  OverviewRankings,
} from '@/types/overview';

type DetailKind = 'customers' | 'areas';

type OverviewRankingDetailModalProps = {
  visible: boolean;
  onDismiss: () => void;
  kind: DetailKind;
  period: OverviewPeriod;
  periodLabel: string;
  token: string;
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

const CUSTOMER_CHART_LIMIT = 15;
const CUSTOMER_COMPARE_LIMIT = 10;
const AREA_NATIONWIDE_CHART_LIMIT = 15;
const AREA_COMPARE_LIMIT = 10;

export function OverviewRankingDetailModal({
  visible,
  onDismiss,
  kind,
  period,
  periodLabel,
  token,
}: OverviewRankingDetailModalProps) {
  const theme = useTheme();
  const detail = useDetailTheme();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OverviewRankings | null>(null);
  const [compareMode, setCompareMode] = useState<OverviewCompareMode>('off');
  const [compareMenuOpen, setCompareMenuOpen] = useState(false);
  const [stateMenuOpen, setStateMenuOpen] = useState(false);
  const [stateFilterId, setStateFilterId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<'total' | 'name'>('total');

  useEffect(() => {
    if (!visible) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCompareMode('off');
    setStateFilterId(null);
    setSearch('');
    setSortKey('total');

    void (async () => {
      try {
        const rankings = await fetchOverviewRankings(token, period);
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
  }, [visible, token, period]);

  const showCompare = compareMode === 'last_month';

  const filteredAreas = useMemo(() => {
    if (!data) {
      return [];
    }
    let rows = data.areas;
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
    let rows = data.customers;
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

  const chartItems = useMemo(() => {
    if (kind === 'customers') {
      const limit = showCompare ? CUSTOMER_COMPARE_LIMIT : CUSTOMER_CHART_LIMIT;
      return filteredCustomers.slice(0, limit).map(row => ({
        id: row.id,
        label: row.name,
        value: row.total,
        compareValue: row.prevTotal,
      }));
    }

    const source =
      stateFilterId == null
        ? filteredAreas.slice(0, AREA_NATIONWIDE_CHART_LIMIT)
        : filteredAreas;
    const limit = showCompare
      ? Math.min(AREA_COMPARE_LIMIT, source.length)
      : source.length;
    return source.slice(0, limit).map(row => ({
      id: row.key,
      label: row.name,
      value: row.total,
      compareValue: row.prevTotal,
    }));
  }, [filteredAreas, filteredCustomers, kind, showCompare, stateFilterId]);

  const selectedStateName =
    stateFilterId == null
      ? 'All Myanmar'
      : (data?.states.find(s => s.id === stateFilterId)?.name ?? 'State');

  const title =
    kind === 'customers' ? 'Most spending customers' : 'Top buying areas';

  const chartHint =
    kind === 'customers'
      ? showCompare
        ? `Top ${CUSTOMER_COMPARE_LIMIT} · ${periodLabel} vs last month`
        : `Top ${CUSTOMER_CHART_LIMIT} · ${periodLabel}`
      : stateFilterId == null
        ? showCompare
          ? `Top ${AREA_COMPARE_LIMIT} nationwide · ${periodLabel} vs last month`
          : `Top ${AREA_NATIONWIDE_CHART_LIMIT} nationwide · ${periodLabel}`
        : showCompare
          ? `${selectedStateName} · top ${AREA_COMPARE_LIMIT} vs last month`
          : `${selectedStateName} townships · ${periodLabel}`;

  return (
    <DismissibleModal
      visible={visible}
      onDismiss={onDismiss}
      title={title}
      contentContainerStyle={styles.modal}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled">
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        ) : error ? (
          <Text style={{ color: theme.colors.error, paddingVertical: 12 }}>
            {error}
          </Text>
        ) : (
          <>
            <View style={styles.toolbar}>
              {kind === 'areas' ? (
                <Menu
                  visible={stateMenuOpen}
                  onDismiss={() => setStateMenuOpen(false)}
                  anchor={
                    <Pressable
                      onPress={() => setStateMenuOpen(true)}
                      style={[
                        styles.menuBtn,
                        { borderColor: detail.border },
                      ]}>
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
              {chartHint}
            </Text>

            <VerticalBarChart
              items={chartItems}
              emptyLabel={
                kind === 'customers'
                  ? 'No customer purchases in this period.'
                  : 'No area sales in this period.'
              }
              formatValue={formatMoney}
              showCompare={showCompare}
              currentLegend={periodLabel}
              compareLegend={data?.compareLabel || 'Last month'}
              maxBars={
                kind === 'areas' && stateFilterId != null ? 50 : 15
              }
            />

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
              <Text style={[styles.th, styles.colRank, { color: detail.label }]}>
                #
              </Text>
              <Text
                style={[styles.th, styles.colName, { color: detail.label }]}>
                {kind === 'customers' ? 'CUSTOMER' : 'AREA'}
              </Text>
              {kind === 'areas' ? (
                <Text
                  style={[styles.th, styles.colState, { color: detail.label }]}>
                  STATE
                </Text>
              ) : (
                <Text
                  style={[styles.th, styles.colOrders, { color: detail.label }]}>
                  ORDERS
                </Text>
              )}
              <Text
                style={[styles.th, styles.colAmount, { color: detail.label }]}>
                TOTAL
              </Text>
              {showCompare ? (
                <Text
                  style={[styles.th, styles.colAmount, { color: detail.label }]}>
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
          </>
        )}
      </ScrollView>
    </DismissibleModal>
  );
}

const styles = StyleSheet.create({
  modal: {
    maxWidth: 720,
    width: '100%',
    maxHeight: '90%',
  },
  body: {
    maxHeight: 560,
  },
  bodyContent: {
    paddingBottom: 8,
    gap: 8,
  },
  center: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
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
