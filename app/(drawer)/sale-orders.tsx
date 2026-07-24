import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Checkbox,
  Icon,
  Text,
  useTheme,
} from 'react-native-paper';

import { SaleOrderDetailView } from '@/components/sale-order/SaleOrderDetailView';
import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { Pagination } from '@/components/ui/Pagination';
import { getSaleOrderStatusColors } from '@/constants/status-colors';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
  useSearch,
} from '@/contexts/search-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchSaleOrderDetail,
  fetchSaleOrders,
} from '@/services/sale-orders';
import { SaleOrder, SaleOrderDetail } from '@/types/sale-order';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';

const PAGE_SIZE = 50;

type ViewMode = 'list' | 'card';

type Column = {
  key: string;
  label: string;
  flex: number;
  align?: 'left' | 'right';
};

const COLUMNS: Column[] = [
  { key: 'number', label: 'Number', flex: 1.4 },
  { key: 'orderDate', label: 'Order Date', flex: 1.5 },
  { key: 'customer', label: 'Customer', flex: 2.2 },
  { key: 'total', label: 'Total', flex: 1.5, align: 'right' },
  { key: 'status', label: 'Status', flex: 1.4 },
];

function formatMoney(value: number): string {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

function StatusBadge({ status }: { status: string }) {
  const { mode } = useAppTheme();
  const { label, bg, fg } = getSaleOrderStatusColors(mode, status);

  if (!status) {
    return <Text style={{ opacity: 0.5 }}>—</Text>;
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text
        variant="labelSmall"
        numberOfLines={1}
        style={{ color: fg, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

function cellText(item: SaleOrder, key: string): string {
  switch (key) {
    case 'number':
      return item.number;
    case 'orderDate':
      return formatMyanmarDateTime(item.orderDate) || item.orderDate;
    case 'customer':
      return item.customer;
    case 'total':
      return formatMoney(item.total);
    default:
      return '';
  }
}

function SaleOrderRow({
  item,
  index,
  selected,
  onToggle,
  onOpen,
}: {
  item: SaleOrder;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();
  const zebra = index % 2 === 1;

  return (
    <Pressable
      onPress={() => onOpen(item.id)}
      style={({ hovered, pressed }) => [
        styles.row,
        {
          backgroundColor: selected
            ? theme.colors.primaryContainer
            : hovered
              ? theme.colors.primaryContainer
              : zebra
                ? theme.colors.surfaceVariant
                : theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <View style={styles.checkCell}>
        <Checkbox
          status={selected ? 'checked' : 'unchecked'}
          onPress={() => onToggle(item.id)}
        />
      </View>
      {COLUMNS.map(col => {
        if (col.key === 'status') {
          return (
            <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
              <StatusBadge status={item.status} />
            </View>
          );
        }

        const text = cellText(item, col.key);
        const isNumber = col.key === 'number';
        const isCustomer = col.key === 'customer';
        const isTotal = col.key === 'total';

        return (
          <View
            key={col.key}
            style={[
              styles.cell,
              isCustomer && styles.customerCell,
              { flex: col.flex },
            ]}>
            {isCustomer ? (
              <CustomerNameText style={{ fontWeight: '400' }}>
                {text || '—'}
              </CustomerNameText>
            ) : (
              <Text
                numberOfLines={1}
                style={{
                  textAlign: col.align === 'right' ? 'right' : 'left',
                  fontWeight: isNumber || isTotal ? '700' : '400',
                  color: isTotal
                    ? theme.colors.primary
                    : text
                      ? theme.colors.onSurface
                      : theme.colors.onSurfaceVariant,
                }}>
                {text || '—'}
              </Text>
            )}
          </View>
        );
      })}
    </Pressable>
  );
}

function TableHeader({
  status,
  onToggleAll,
}: {
  status: 'checked' | 'unchecked' | 'indeterminate';
  onToggleAll: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        styles.headerRow,
        { backgroundColor: theme.colors.primary },
      ]}>
      <View style={styles.checkCell}>
        <Checkbox
          status={status}
          onPress={onToggleAll}
          color={theme.colors.onPrimary}
          uncheckedColor={theme.colors.onPrimary}
        />
      </View>
      {COLUMNS.map(col => (
        <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
          <Text
            variant="labelMedium"
            numberOfLines={1}
            style={{
              color: theme.colors.onPrimary,
              fontWeight: '700',
              textAlign: col.align === 'right' ? 'right' : 'left',
            }}>
            {col.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SaleOrderCard({
  item,
  selected,
  onToggle,
  onOpen,
}: {
  item: SaleOrder;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const colors = useAppColors();
  const statusColors = getSaleOrderStatusColors(mode, item.status);

  return (
    <Pressable
      onPress={() => onOpen(item.id)}
      style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
      <View
        style={[
          styles.orderCard,
          {
            backgroundColor: selected
              ? theme.colors.primaryContainer
              : theme.colors.surface,
            borderColor: selected ? theme.colors.primary : theme.colors.outline,
            shadowColor: colors.detailShadow,
          },
        ]}>
        <View style={[styles.cardAccent, { backgroundColor: statusColors.bg }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={styles.cardCheck}>
              <Checkbox
                status={selected ? 'checked' : 'unchecked'}
                onPress={() => onToggle(item.id)}
              />
            </View>
            <Text variant="titleMedium" style={styles.cardNumber} numberOfLines={1}>
              {item.number || '—'}
            </Text>
            <StatusBadge status={item.status} />
          </View>

          <CustomerNameText style={{ fontWeight: '600' }}>
            {item.customer?.trim() || '—'}
          </CustomerNameText>

          {item.salesperson ? (
            <View style={styles.cardMetaRow}>
              <Icon
                source="account-outline"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
                numberOfLines={1}>
                {item.salesperson}
              </Text>
            </View>
          ) : null}

          <View style={styles.cardFooter}>
            <View style={styles.cardMetaRow}>
              <Icon source="calendar" size={14} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatMyanmarDateTime(item.orderDate) || item.orderDate || '—'}
              </Text>
            </View>
            <View
              style={[
                styles.totalChip,
                { backgroundColor: theme.colors.primaryContainer },
              ]}>
              <Text
                style={{
                  color: theme.colors.primary,
                  fontWeight: '800',
                  fontSize: 13,
                }}>
                {formatMoney(item.total)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function SaleOrdersScreen() {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const [items, setItems] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<SaleOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const query = useModuleSearch('Search by number or customer', !selectedId);
  const { setDetailHeader } = useSearch();

  const load = useCallback(async () => {
    if (!session?.token) return;
    setError('');
    try {
      const data = await fetchSaleOrders(session.token, {
        q: query.trim() || undefined,
        limit: 300,
      });
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load sale orders.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.token, query]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openDetail = useCallback(
    async (id: string) => {
      if (!session?.token) return;
      setSelectedId(id);
      setDetail(null);
      setDetailLoading(true);
      setDetailError('');
      try {
        const data = await fetchSaleOrderDetail(session.token, id);
        setDetail(data);
      } catch (err) {
        setDetailError(
          err instanceof Error
            ? err.message
            : 'Failed to load sale order.',
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [session?.token],
  );

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailError('');
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDetailHeader(null);
      return;
    }

    setDetailHeader({
      title: detail?.number ?? 'Sale Order',
      onBack: closeDetail,
      statusLabel: detail
        ? getSaleOrderStatusColors(mode, detail.status).label
        : undefined,
      breadcrumbParent: 'Sale Order',
    });

    return () => setDetailHeader(null);
  }, [selectedId, detail, closeDetail, setDetailHeader, mode]);

  const toggleView = useCallback(() => {
    setViewMode(prev => (prev === 'list' ? 'card' : 'list'));
  }, []);

  const headerActions = useMemo<HeaderAction[]>(() => {
    if (selectedId) {
      return [];
    }
    return [
      {
        key: 'view',
        icon: viewMode === 'list' ? 'view-grid-outline' : 'format-list-bulleted',
        onPress: toggleView,
        accessibilityLabel: 'Toggle list or card view',
      },
    ];
  }, [selectedId, viewMode, toggleView]);

  useHeaderActions(headerActions);

  const filtered = useMemo(() => items, [items]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [query, viewMode]);

  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const selectedOnPage = paged.reduce(
    (count, order) => count + (selectedIds.has(order.id) ? 1 : 0),
    0,
  );
  const headerStatus: 'checked' | 'unchecked' | 'indeterminate' =
    selectedOnPage === 0
      ? 'unchecked'
      : selectedOnPage === paged.length
        ? 'checked'
        : 'indeterminate';

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAllOnPage = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const ids = paged.map(order => order.id);
      const allSelected = ids.length > 0 && ids.every(id => next.has(id));
      ids.forEach(id => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }, [paged]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [query]);

  const numColumns = useMemo(() => {
    if (width >= 1200) {
      return 3;
    }
    if (width >= 768) {
      return 2;
    }
    return 1;
  }, [width]);

  const cardWidth = useMemo(() => {
    const horizontalPadding = 32;
    const gap = 12;
    const available = width - horizontalPadding - gap * (numColumns - 1);
    return available / numColumns;
  }, [width, numColumns]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  if (selectedId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SaleOrderDetailView
          detail={detail}
          loading={detailLoading}
          error={detailError}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading sale orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium" style={styles.errorTitle}>
          Could not load sale orders
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {viewMode === 'list' ? (
        filtered.length === 0 ? (
          <ScrollView
            style={styles.tableScroll}
            contentContainerStyle={styles.tableEmptyContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            <Text style={styles.empty}>
              {query.trim()
                ? 'No sale orders match your search.'
                : 'No sale orders found in Odoo.'}
            </Text>
          </ScrollView>
        ) : (
          <View style={styles.tableScroll}>
            <TableHeader status={headerStatus} onToggleAll={toggleAllOnPage} />
            <ScrollView
              style={styles.listBody}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }>
              {paged.map((item, index) => (
                <SaleOrderRow
                  key={item.id}
                  item={item}
                  index={index}
                  selected={selectedIds.has(item.id)}
                  onToggle={toggleOne}
                  onOpen={openDetail}
                />
              ))}
            </ScrollView>
          </View>
        )
      ) : (
        <FlatList
          key={numColumns}
          data={paged}
          numColumns={numColumns}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          renderItem={({ item }) => (
            <View
              style={[
                styles.cardWrapper,
                { width: numColumns > 1 ? cardWidth : '100%' },
              ]}>
              <SaleOrderCard
                item={item}
                selected={selectedIds.has(item.id)}
                onToggle={toggleOne}
                onOpen={openDetail}
              />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim()
                ? 'No sale orders match your search.'
                : 'No sale orders found in Odoo.'}
            </Text>
          }
        />
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        centerLabel={`${items.length} from Odoo`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  tableScroll: {
    flex: 1,
  },
  listBody: {
    flex: 1,
  },
  tableEmptyContent: {
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  headerRow: {
    minHeight: 44,
    alignItems: 'center',
    paddingVertical: 0,
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    minWidth: 0,
    overflow: 'visible',
  },
  customerCell: {
    paddingVertical: 10,
    justifyContent: 'flex-start',
  },
  checkCell: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 10,
    transform: [{ scale: 0.8 }],
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  orderCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccent: {
    width: 5,
  },
  cardBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardCheck: {
    marginLeft: -8,
    transform: [{ scale: 0.85 }],
  },
  cardNumber: {
    fontWeight: '800',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  totalChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.7,
  },
  errorTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
});
