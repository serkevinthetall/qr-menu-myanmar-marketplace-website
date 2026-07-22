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
  Card,
  Divider,
  Text,
  useTheme,
} from 'react-native-paper';

import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { Pagination } from '@/components/ui/Pagination';
import { getPurchaseOrderStatusColors } from '@/constants/status-colors';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
  useSearch,
} from '@/contexts/search-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchPurchaseOrderDetail,
  fetchPurchaseOrders,
} from '@/services/purchase-orders';
import {
  PurchaseOrder,
  PurchaseOrderDetail,
  PurchaseOrderLine,
} from '@/types/purchase-order';
import { formatMyanmarDate, formatMyanmarDateTime } from '@/utils/myanmar-datetime';

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
  { key: 'vendor', label: 'Vendor', flex: 2.2 },
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
  const { label, bg, fg } = getPurchaseOrderStatusColors(mode, status);

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

function cellText(item: PurchaseOrder, key: string): string {
  switch (key) {
    case 'number':
      return item.number;
    case 'orderDate':
      return formatMyanmarDateTime(item.orderDate) || item.orderDate;
    case 'vendor':
      return item.vendor;
    case 'total':
      return formatMoney(item.total);
    default:
      return '';
  }
}

function PurchaseOrderRow({
  item,
  index,
  onOpen,
}: {
  item: PurchaseOrder;
  index: number;
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
          backgroundColor: hovered
            ? theme.colors.primaryContainer
            : zebra
              ? theme.colors.surfaceVariant
              : theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
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
        const isVendor = col.key === 'vendor';

        return (
          <View
            key={col.key}
            style={[
              styles.cell,
              isVendor && styles.vendorCell,
              { flex: col.flex },
            ]}>
            {isVendor ? (
              <CustomerNameText style={{ fontWeight: '400' }}>
                {text || '—'}
              </CustomerNameText>
            ) : (
              <Text
                numberOfLines={1}
                style={{
                  textAlign: col.align === 'right' ? 'right' : 'left',
                  fontWeight: isNumber ? '600' : '400',
                  color: text
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

function TableHeader() {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        styles.headerRow,
        { backgroundColor: theme.colors.primary },
      ]}>
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

function PurchaseOrderCard({
  item,
  onOpen,
}: {
  item: PurchaseOrder;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();

  return (
    <Card
      mode="elevated"
      onPress={() => onOpen(item.id)}
      style={[
        styles.orderCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text variant="titleMedium" style={styles.cardNumber} numberOfLines={1}>
            {item.number || '—'}
          </Text>
          <StatusBadge status={item.status} />
        </View>

        <CustomerNameText>{item.vendor?.trim() || '—'}</CustomerNameText>

        {item.buyer ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            numberOfLines={1}>
            {item.buyer}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatMyanmarDateTime(item.orderDate) || item.orderDate || '—'}
          </Text>
          <Text
            variant="titleSmall"
            style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {formatMoney(item.total)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      <CustomerNameText size="body" style={{ fontWeight: '600' }}>
        {value.trim() || '—'}
      </CustomerNameText>
    </View>
  );
}

function OrderLineRow({ line }: { line: PurchaseOrderLine }) {
  const theme = useTheme();
  const qty = Number(line.quantity) || 0;

  return (
    <View
      style={[
        styles.lineRow,
        { borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline },
      ]}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontWeight: '600' }} numberOfLines={2}>
          {line.product || '—'}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {qty} {line.unit || 'Units'} × {formatMoney(line.unitPrice)}
        </Text>
      </View>
      <Text style={{ fontWeight: '700', color: theme.colors.primary }}>
        {formatMoney(line.amount)}
      </Text>
    </View>
  );
}

export default function PurchaseOrdersScreen() {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const [items, setItems] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<PurchaseOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const query = useModuleSearch('Search by number or vendor', !selectedId);
  const { setDetailHeader } = useSearch();

  const load = useCallback(async () => {
    if (!session?.token) return;
    setError('');
    try {
      const data = await fetchPurchaseOrders(session.token, {
        q: query.trim() || undefined,
        limit: 300,
      });
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load purchase orders.',
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
      setDetailLoading(true);
      setDetailError('');
      setDetail(null);
      try {
        const data = await fetchPurchaseOrderDetail(session.token, id);
        setDetail(data);
      } catch (err) {
        setDetailError(
          err instanceof Error
            ? err.message
            : 'Failed to load purchase order.',
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
      title: detail?.number ?? 'Purchase Order',
      onBack: closeDetail,
      statusLabel: detail
        ? getPurchaseOrderStatusColors(mode, detail.status).label
        : undefined,
      breadcrumbParent: 'Purchase Order',
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
        {detailLoading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : detailError ? (
          <View style={styles.center}>
            <Text style={{ color: theme.colors.error }}>{detailError}</Text>
          </View>
        ) : detail ? (
          <ScrollView contentContainerStyle={styles.detailContent}>
            <MetaRow label="NUMBER" value={detail.number} />
            <MetaRow label="VENDOR" value={detail.vendor} />
            <MetaRow label="BUYER" value={detail.buyer} />
            <MetaRow
              label="ORDER DATE"
              value={
                formatMyanmarDateTime(detail.orderDate) || detail.orderDate
              }
            />
            <MetaRow
              label="SCHEDULED DATE"
              value={
                formatMyanmarDate(detail.scheduledDate) || detail.scheduledDate
              }
            />
            <MetaRow
              label="STATUS"
              value={getPurchaseOrderStatusColors(mode, detail.status).label}
            />
            <MetaRow label="ORIGIN" value={detail.origin} />
            <MetaRow label="CURRENCY" value={detail.currency} />
            <MetaRow label="UNTAXED" value={formatMoney(detail.untaxedAmount)} />
            <MetaRow label="TOTAL" value={formatMoney(detail.total)} />

            <Divider style={styles.divider} />
            <Text variant="titleSmall" style={styles.linesTitle}>
              Order lines
            </Text>
            {detail.lines.length === 0 ? (
              <Text style={{ opacity: 0.6, marginTop: 8 }}>No order lines.</Text>
            ) : (
              detail.lines.map(line => <OrderLineRow key={line.id} line={line} />)
            )}
          </ScrollView>
        ) : null}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading purchase orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium" style={styles.errorTitle}>
          Could not load purchase orders
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
                ? 'No purchase orders match your search.'
                : 'No purchase orders found in Odoo.'}
            </Text>
          </ScrollView>
        ) : (
          <View style={styles.tableScroll}>
            <TableHeader />
            <ScrollView
              style={styles.listBody}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }>
              {paged.map((item, index) => (
                <PurchaseOrderRow
                  key={item.id}
                  item={item}
                  index={index}
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
              <PurchaseOrderCard item={item} onOpen={openDetail} />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim()
                ? 'No purchase orders match your search.'
                : 'No purchase orders found in Odoo.'}
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
  vendorCell: {
    paddingVertical: 10,
    justifyContent: 'flex-start',
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
  },
  cardContent: {
    gap: 8,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardNumber: {
    fontWeight: '700',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
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
  detailContent: { padding: 16, paddingBottom: 40, gap: 4 },
  metaRow: { marginBottom: 12, gap: 2 },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  divider: { marginVertical: 10 },
  linesTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
