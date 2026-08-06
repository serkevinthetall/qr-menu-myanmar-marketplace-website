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
  Badge,
  Checkbox,
  Chip,
  Icon,
  IconButton,
  Text,
  useTheme,
} from 'react-native-paper';

import { SaleOrderDateTotalBar } from '@/components/sale-order/SaleOrderDateTotalBar';
import { SaleOrderDetailView } from '@/components/sale-order/SaleOrderDetailView';
import {
  EMPTY_SALE_ORDER_FILTERS,
  getSaleOrderFilterDateLabel,
  hasActiveSaleOrderFilters,
  matchesSaleOrderFilters,
  SaleOrderFilterBar,
  SaleOrderFilters,
} from '@/components/sale-order/SaleOrderFilterBar';
import { SaleOrderPrintPreview } from '@/components/sale-order/SaleOrderPrintPreview';
import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { Pagination } from '@/components/ui/Pagination';
import { getSaleOrderStatusColors } from '@/constants/status-colors';
import { useAppOrderUnread } from '@/contexts/app-order-unread-context';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleFilters,
  useModuleSearch,
  useSearch,
} from '@/contexts/search-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchOnlineOrderDetail,
  fetchOnlineOrders,
} from '@/services/online-orders';
import { SaleOrder, SaleOrderDetail } from '@/types/sale-order';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';
import { ONLINE_ORDERS_REFRESH_EVENT } from '@/utils/online-order-alerts-preference';
import { PrintFormat } from '@/utils/print-quotation';

const PAGE_SIZE = 50;

type ViewMode = 'list' | 'card';
type ReadFilter = 'all' | 'unread' | 'read';

type Column = {
  key: string;
  label: string;
  flex: number;
  align?: 'left' | 'right';
};

const COLUMNS: Column[] = [
  { key: 'number', label: 'Number', flex: 1.2 },
  { key: 'orderDate', label: 'Order Date', flex: 1.3 },
  { key: 'customer', label: 'Customer', flex: 1.6 },
  { key: 'phoneNumber', label: 'Phonenumber', flex: 1.2 },
  { key: 'salePersonName', label: 'Sale Person', flex: 1.3 },
  { key: 'total', label: 'Total', flex: 1.3, align: 'right' },
  { key: 'status', label: 'Status', flex: 1.2 },
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
    case 'phoneNumber':
      return item.phoneNumber?.trim() || '';
    case 'salePersonName':
      return item.salePersonName?.trim() || '';
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
  onToggleRead,
}: {
  item: SaleOrder;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onToggleRead: (id: string, nextRead: boolean) => void;
}) {
  const theme = useTheme();
  const zebra = index % 2 === 1;
  const unread = Boolean(item.unread);

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
      <View style={styles.readCell}>
        <IconButton
          icon={unread ? 'email-mark-as-unread' : 'email-open-outline'}
          size={18}
          onPress={() => onToggleRead(item.id, unread)}
          accessibilityLabel={unread ? 'Mark as read' : 'Mark as unread'}
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
        const isSalePerson = col.key === 'salePersonName';
        const isTotal = col.key === 'total';
        const useNameText = isCustomer || isSalePerson;

        return (
          <View
            key={col.key}
            style={[
              styles.cell,
              isCustomer && styles.customerCell,
              { flex: col.flex },
            ]}>
            {isNumber ? (
              <View style={styles.numberCell}>
                {unread ? <Badge size={8} style={styles.unreadDot} /> : null}
                <Text
                  numberOfLines={1}
                  style={{
                    flex: 1,
                    fontWeight: unread ? '800' : '700',
                    color: text
                      ? theme.colors.onSurface
                      : theme.colors.onSurfaceVariant,
                  }}>
                  {text || '—'}
                </Text>
              </View>
            ) : useNameText ? (
              <CustomerNameText
                numberOfLines={1}
                style={{
                  fontWeight: unread ? '700' : '400',
                  paddingTop: 0,
                  paddingBottom: 0,
                  lineHeight: 20,
                  fontSize: 14,
                }}>
                {text || '—'}
              </CustomerNameText>
            ) : (
              <Text
                numberOfLines={1}
                style={{
                  textAlign: col.align === 'right' ? 'right' : 'left',
                  fontWeight: isTotal ? '700' : unread ? '600' : '400',
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
      <View style={styles.readCell} />
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
  onToggleRead,
}: {
  item: SaleOrder;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onToggleRead: (id: string, nextRead: boolean) => void;
}) {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const colors = useAppColors();
  const statusColors = getSaleOrderStatusColors(mode, item.status);
  const unread = Boolean(item.unread);

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
            <View style={styles.cardNumberRow}>
              {unread ? <Badge size={8} style={styles.unreadDot} /> : null}
              <Text
                variant="titleMedium"
                style={[styles.cardNumber, { fontWeight: unread ? '800' : '700' }]}
                numberOfLines={1}>
                {item.number || '—'}
              </Text>
            </View>
            <IconButton
              icon={unread ? 'email-mark-as-unread' : 'email-open-outline'}
              size={18}
              onPress={() => onToggleRead(item.id, unread)}
              accessibilityLabel={unread ? 'Mark as read' : 'Mark as unread'}
            />
            <StatusBadge status={item.status} />
          </View>

          <CustomerNameText style={{ fontWeight: '600' }}>
            {item.customer?.trim() || '—'}
          </CustomerNameText>

          {item.phoneNumber?.trim() ? (
            <View style={styles.cardMetaRow}>
              <Icon
                source="phone-outline"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}
                numberOfLines={1}>
                {item.phoneNumber}
              </Text>
            </View>
          ) : null}

          {item.salePersonName?.trim() ? (
            <View style={styles.cardMetaRow}>
              <Icon
                source="account-outline"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <CustomerNameText
                muted
                style={{ fontWeight: '400', fontSize: 13, flex: 1, paddingTop: 0, paddingBottom: 0 }}
                numberOfLines={1}>
                {item.salePersonName}
              </CustomerNameText>
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

export default function OnlineOrdersScreen() {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const { refreshUnreadCount, markOrderReadState } = useAppOrderUnread();
  const [items, setItems] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<SaleOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [printPreview, setPrintPreview] = useState<{
    format: PrintFormat;
    detail: SaleOrderDetail;
  } | null>(null);
  const [orderFilters, setOrderFilters] = useState<SaleOrderFilters>(
    EMPTY_SALE_ORDER_FILTERS,
  );

  const query = useModuleSearch('Search by number or customer', !selectedId);
  const { setDetailHeader } = useSearch();

  const filterPanel = useMemo(
    () => (
      <View style={styles.readFilterPanel}>
        <View style={styles.readFilterRow}>
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'read', label: 'Read' },
            ] as const
          ).map(opt => (
            <Chip
              key={opt.id}
              compact
              selected={readFilter === opt.id}
              onPress={() => setReadFilter(opt.id)}
              style={styles.readFilterChip}
            >
              {opt.label}
            </Chip>
          ))}
        </View>
        <SaleOrderFilterBar filters={orderFilters} onChange={setOrderFilters} />
      </View>
    ),
    [orderFilters, readFilter],
  );

  useModuleFilters(filterPanel, !selectedId);

  const load = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!session?.token) return;
    const quiet = Boolean(opts?.quiet);
    if (!quiet) {
      setError('');
    }
    try {
      await fetchOnlineOrders(session.token, {
        q: query.trim() || undefined,
        pageSize: 100,
        onPage: all => {
          setItems(all);
          if (!quiet) {
            setLoading(false);
          }
        },
      });
      if (!quiet) {
        setError('');
      }
    } catch (err) {
      if (!quiet) {
        setError(
          err instanceof Error ? err.message : 'Failed to load app orders.',
        );
      }
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

  // Keep the App Order list live without a manual refresh.
  useEffect(() => {
    if (!session?.token || selectedId) {
      return;
    }
    const timer = setInterval(() => {
      void load({ quiet: true });
    }, 15_000);

    const onRefresh = () => {
      void load({ quiet: true });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(ONLINE_ORDERS_REFRESH_EVENT, onRefresh);
    }

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener(ONLINE_ORDERS_REFRESH_EVENT, onRefresh);
      }
    };
  }, [session?.token, selectedId, load]);

  const openDetail = useCallback(
    async (id: string) => {
      if (!session?.token) return;
      setSelectedId(id);
      setDetail(null);
      setDetailLoading(true);
      setDetailError('');
      try {
        const data = await fetchOnlineOrderDetail(session.token, id);
        setDetail(data);
        setItems(prev =>
          prev.map(order =>
            order.id === id ? { ...order, unread: false } : order,
          ),
        );
        void refreshUnreadCount();
      } catch (err) {
        setDetailError(
          err instanceof Error
            ? err.message
            : 'Failed to load app order.',
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [session?.token, refreshUnreadCount],
  );

  const toggleRead = useCallback(
    async (id: string, nextRead: boolean) => {
      try {
        setItems(prev =>
          prev.map(order =>
            order.id === id ? { ...order, unread: !nextRead } : order,
          ),
        );
        await markOrderReadState(id, nextRead);
      } catch {
        void load({ quiet: true });
      }
    },
    [markOrderReadState, load],
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
      title: detail?.number ?? 'App Order',
      onBack: closeDetail,
      statusLabel: detail
        ? getSaleOrderStatusColors(mode, detail.status).label
        : undefined,
      breadcrumbParent: 'App Order',
      onPrint: detail
        ? format => setPrintPreview({ format, detail })
        : undefined,
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

  const filtered = useMemo(
    () =>
      items.filter(order => {
        if (!matchesSaleOrderFilters(order, orderFilters)) return false;
        if (readFilter === 'unread') return Boolean(order.unread);
        if (readFilter === 'read') return !order.unread;
        return true;
      }),
    [items, orderFilters, readFilter],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const filtersActive = hasActiveSaleOrderFilters(orderFilters);
  const filteredTotalAmount = useMemo(
    () => filtered.reduce((sum, order) => sum + (Number(order.total) || 0), 0),
    [filtered],
  );
  const filterDateLabel = useMemo(
    () => getSaleOrderFilterDateLabel(orderFilters),
    [orderFilters],
  );

  useEffect(() => {
    setPage(1);
  }, [query, viewMode, orderFilters, readFilter]);

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
  }, [query, orderFilters]);

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
        {printPreview ? (
          <SaleOrderPrintPreview
            detail={printPreview.detail}
            format={printPreview.format}
            documentLabel="APP ORDER"
            onClose={() => setPrintPreview(null)}
          />
        ) : null}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading app orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium" style={styles.errorTitle}>
          Could not load app orders
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {filtersActive ? (
        <SaleOrderDateTotalBar
          dateLabel={filterDateLabel}
          orderCount={filtered.length}
          totalAmount={filteredTotalAmount}
          itemLabel="order"
          placement="top"
        />
      ) : null}

      {viewMode === 'list' ? (
        filtered.length === 0 ? (
          <ScrollView
            style={styles.tableScroll}
            contentContainerStyle={styles.tableEmptyContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            <Text style={styles.empty}>
              {query.trim() || filtersActive || readFilter !== 'all'
                ? 'No app orders match your search or filters.'
                : 'No App Orders found (Quotation Sent or Salesperson Administrator).'}
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
                  onToggleRead={toggleRead}
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
                onToggleRead={toggleRead}
              />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim() || filtersActive || readFilter !== 'all'
                ? 'No app orders match your search or filters.'
                : 'No App Orders found (Quotation Sent or Salesperson Administrator).'}
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
        centerLabel={`${filtered.length} from Odoo`}
        itemLabel="order"
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
    alignItems: 'center',
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
    justifyContent: 'center',
  },
  checkCell: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 0.8 }],
  },
  readCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  unreadDot: {
    backgroundColor: '#D32F2F',
    alignSelf: 'center',
  },
  readFilterPanel: {
    gap: 4,
  },
  readFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 4,
    justifyContent: 'center',
  },
  readFilterChip: {
    marginRight: 0,
  },
  cardNumberRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
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
