import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
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
  Button,
  Checkbox,
  Chip,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';

import { PayInvoiceDialog } from '@/components/delivery/PayInvoiceDialog';
import { OrderDateGroupHeader } from '@/components/order/OrderDateGroupHeader';
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
import {
  canCreateInvoice,
  canPayInvoice,
  canValidateDelivery,
  getSaleOrderStatusColors,
} from '@/constants/status-colors';
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
import { APP_ORDER_LIST_POLL_MS } from '@/services/badges';
import {
  createOnlineOrderInvoice,
  fetchOnlineOrderDetail,
  fetchOnlineOrders,
  payOnlineOrderInvoice,
  validateOnlineOrderDelivery,
} from '@/services/online-orders';
import { fetchPaymentMethods } from '@/services/quotations';
import { PaymentMethod } from '@/types/quotation';
import { SaleOrder, SaleOrderDetail } from '@/types/sale-order';
import { asIdSet, useListUiCache } from '@/utils/list-ui-cache';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';
import { ONLINE_ORDERS_REFRESH_EVENT } from '@/utils/online-order-alerts-preference';
import { groupOrdersByMonthDay } from '@/utils/order-date-groups';
import { pushOrderDeliveries } from '@/utils/order-delivery-nav';
import { PrintFormat } from '@/utils/print-quotation';

const PAGE_SIZE = 50;

type ViewMode = 'list' | 'card';
type ReadFilter = 'all' | 'unread' | 'read';

type OnlineOrdersListUi = {
  viewMode: ViewMode;
  readFilter: ReadFilter;
  /** Odoo-style Order Date: Month > Day grouping (list view). */
  groupByOrderDate: boolean;
  orderFilters: SaleOrderFilters;
  selectedIds: string[];
};

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
  onValidateDelivery,
  validating,
}: {
  item: SaleOrder;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onToggleRead: (id: string, nextRead: boolean) => void;
  onValidateDelivery?: (id: string) => void;
  validating?: boolean;
}) {
  const theme = useTheme();
  const zebra = index % 2 === 1;
  const unread = Boolean(item.unread);
  const showValidate = Boolean(item.canValidateDelivery && onValidateDelivery);

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
      <View style={styles.actionCell}>
        {showValidate ? (
          <IconButton
            icon="truck-check-outline"
            size={20}
            disabled={validating}
            onPress={() => onValidateDelivery?.(item.id)}
            accessibilityLabel={`Validate delivery for ${item.number}`}
          />
        ) : null}
      </View>
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
      <View style={styles.actionCell} />
    </View>
  );
}

function SaleOrderCard({
  item,
  selected,
  onToggle,
  onOpen,
  onToggleRead,
  onValidateDelivery,
  validating,
}: {
  item: SaleOrder;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onToggleRead: (id: string, nextRead: boolean) => void;
  onValidateDelivery?: (id: string) => void;
  validating?: boolean;
}) {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const colors = useAppColors();
  const statusColors = getSaleOrderStatusColors(mode, item.status);
  const unread = Boolean(item.unread);
  const showValidate = Boolean(item.canValidateDelivery && onValidateDelivery);

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
            {showValidate ? (
              <IconButton
                icon="truck-check-outline"
                size={18}
                disabled={validating}
                onPress={() => onValidateDelivery?.(item.id)}
                accessibilityLabel={`Validate delivery for ${item.number}`}
              />
            ) : null}
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
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const { mode } = useAppTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const { refreshUnreadCount, markOrderReadState, markAllOrdersRead } =
    useAppOrderUnread();
  const [items, setItems] = useState<SaleOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [groupByOrderDate, setGroupByOrderDate] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<SaleOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailValidatingDelivery, setDetailValidatingDelivery] = useState(false);
  const [bulkValidateVisible, setBulkValidateVisible] = useState(false);
  const [detailCreatingInvoice, setDetailCreatingInvoice] = useState(false);
  const [createInvoiceVisible, setCreateInvoiceVisible] = useState(false);
  const [detailPayingInvoice, setDetailPayingInvoice] = useState(false);
  const [payInvoiceVisible, setPayInvoiceVisible] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [printPreview, setPrintPreview] = useState<{
    format: PrintFormat;
    detail: SaleOrderDetail;
  } | null>(null);
  const [orderFilters, setOrderFilters] = useState<SaleOrderFilters>({
    ...EMPTY_SALE_ORDER_FILTERS,
    period: 'today',
  });

  const listUiSnapshot = useMemo<OnlineOrdersListUi>(
    () => ({
      viewMode,
      readFilter,
      groupByOrderDate,
      orderFilters,
      selectedIds: [...selectedIds],
    }),
    [viewMode, readFilter, groupByOrderDate, orderFilters, selectedIds],
  );

  useListUiCache<OnlineOrdersListUi>('online-orders', listUiSnapshot, saved => {
    if (saved.viewMode === 'list' || saved.viewMode === 'card') {
      setViewMode(saved.viewMode);
    }
    if (
      saved.readFilter === 'all' ||
      saved.readFilter === 'unread' ||
      saved.readFilter === 'read'
    ) {
      setReadFilter(saved.readFilter);
    }
    // Month/Day grouping is always on for list view (ignore saved off).
    setGroupByOrderDate(true);
    if (saved.orderFilters && typeof saved.orderFilters === 'object') {
      setOrderFilters({
        ...EMPTY_SALE_ORDER_FILTERS,
        ...saved.orderFilters,
      });
    }
    if (saved.selectedIds) {
      setSelectedIds(asIdSet(saved.selectedIds));
    }
  });

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
    [orderFilters, readFilter, groupByOrderDate],
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

  // Keep the App Order list live without a manual refresh (30s, visible tab).
  useEffect(() => {
    if (!session?.token || selectedId) {
      return;
    }

    let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      void load({ quiet: true });
    };

    const timer = setInterval(tick, APP_ORDER_LIST_POLL_MS);

    const onRefresh = () => {
      void load({ quiet: true });
    };
    const onVisibility = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      ) {
        tick();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(ONLINE_ORDERS_REFRESH_EVENT, onRefresh);
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      cancelled = true;
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener(ONLINE_ORDERS_REFRESH_EVENT, onRefresh);
        document.removeEventListener('visibilitychange', onVisibility);
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
    setDetailValidatingDelivery(false);
    setDetailCreatingInvoice(false);
    setCreateInvoiceVisible(false);
    setDetailPayingInvoice(false);
    setPayInvoiceVisible(false);
    setPaymentMethods([]);
    setPaymentMethodsLoading(false);
  }, []);

  const openDeliveriesPage = useCallback(
    (orderId: string, orderNumber?: string) => {
      if (!orderId) {
        return;
      }
      pushOrderDeliveries(routerRef.current, {
        source: 'online-orders',
        orderId,
        orderNumber,
      });
    },
    [],
  );



  const handleBulkValidateDelivery = useCallback(async () => {
    if (!session?.token) {
      return;
    }
    const targets = items.filter(
      order => selectedIds.has(order.id) && order.canValidateDelivery,
    );
    if (targets.length === 0) {
      return;
    }
    setDetailValidatingDelivery(true);
    setBulkValidateVisible(false);
    let ok = 0;
    let fail = 0;
    for (const order of targets) {
      try {
        const updated = await validateOnlineOrderDelivery(
          session.token,
          order.id,
        );
        ok += 1;
        setItems(prev =>
          prev.map(row =>
            row.id === updated.id
              ? {
                  ...row,
                  canValidateDelivery: Boolean(updated.canValidateDelivery),
                }
              : row,
          ),
        );
      } catch {
        fail += 1;
      }
    }
    setDetailValidatingDelivery(false);
    if (fail === 0) {
      setSnackbar(
        `Validated delivery for ${ok} order${ok === 1 ? '' : 's'}.`,
      );
    } else {
      setSnackbar(
        `Validated ${ok}, failed ${fail} of ${targets.length} orders.`,
      );
    }
  }, [session?.token, items, selectedIds]);

  const handleCreateInvoice = useCallback(async () => {
    if (!session?.token || !selectedId) {
      return;
    }
    setDetailCreatingInvoice(true);
    setDetailError('');
    try {
      const updated = await createOnlineOrderInvoice(session.token, selectedId);
      setDetail(updated);
      setCreateInvoiceVisible(false);
      setSnackbar(
        updated.invoiceName
          ? `Invoice ${updated.invoiceName} created for ${updated.number}.`
          : `Invoice created for ${updated.number}.`,
      );
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : 'Failed to create invoice.',
      );
    } finally {
      setDetailCreatingInvoice(false);
    }
  }, [session?.token, selectedId]);

  const openPayInvoice = useCallback(async () => {
    if (!session?.token) {
      return;
    }
    setPayInvoiceVisible(true);
    setPaymentMethodsLoading(true);
    try {
      const methods = await fetchPaymentMethods(session.token);
      setPaymentMethods(methods);
    } catch (err) {
      setDetailError(
        err instanceof Error ? err.message : 'Failed to load payment methods.',
      );
    } finally {
      setPaymentMethodsLoading(false);
    }
  }, [session?.token]);

  const handlePayInvoice = useCallback(
    async (paymentMethodLineId: string) => {
      if (!session?.token || !selectedId) {
        return;
      }
      setDetailPayingInvoice(true);
      setDetailError('');
      try {
        const updated = await payOnlineOrderInvoice(
          session.token,
          selectedId,
          paymentMethodLineId,
        );
        setDetail(updated);
        setPayInvoiceVisible(false);
        setSnackbar(
          updated.paymentLabel
            ? `Paid ${updated.paymentLabel} for ${updated.number}.`
            : `Payment registered for ${updated.number}.`,
        );
      } catch (err) {
        setDetailError(
          err instanceof Error ? err.message : 'Failed to register payment.',
        );
      } finally {
        setDetailPayingInvoice(false);
      }
    },
    [session?.token, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setDetailHeader(null);
      return;
    }

    const showValidate = detail ? canValidateDelivery(detail) : false;
    const showInvoice = detail ? canCreateInvoice(detail) : false;
    const showPay = detail ? canPayInvoice(detail) : false;

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
      onValidateDelivery: showValidate
        ? () => {
            openDeliveriesPage(selectedId, detail?.number);
          }
        : undefined,
      validatingDelivery: detailValidatingDelivery,
      onOpenDelivery:
        (detail?.deliveryCount ?? 0) > 0
          ? () => {
              openDeliveriesPage(selectedId, detail?.number);
            }
          : undefined,
      deliveryCount: detail?.deliveryCount ?? 0,
      onCreateInvoice: showInvoice
        ? () => setCreateInvoiceVisible(true)
        : undefined,
      creatingInvoice: detailCreatingInvoice,
      onPayInvoice: showPay
        ? () => {
            void openPayInvoice();
          }
        : undefined,
      payingInvoice: detailPayingInvoice,
    });

    return () => setDetailHeader(null);
  }, [
    selectedId,
    detail,
    closeDetail,
    setDetailHeader,
    mode,
    detailValidatingDelivery,
    detailCreatingInvoice,
    detailPayingInvoice,
    openDeliveriesPage,
    openPayInvoice,
  ]);

  const toggleView = useCallback(() => {
    setViewMode(prev => (prev === 'list' ? 'card' : 'list'));
  }, []);

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

  const markAllVisibleRead = useCallback(async () => {
    const unreadIds = filtered
      .filter(order => Boolean(order.unread))
      .map(order => order.id);
    if (unreadIds.length === 0) {
      return;
    }
    setItems(prev =>
      prev.map(order =>
        unreadIds.includes(order.id) ? { ...order, unread: false } : order,
      ),
    );
    try {
      await markAllOrdersRead(unreadIds);
    } catch {
      void load({ quiet: true });
    }
  }, [filtered, markAllOrdersRead, load]);

  const selectedValidatable = useMemo(
    () =>
      items.filter(
        order => selectedIds.has(order.id) && Boolean(order.canValidateDelivery),
      ),
    [items, selectedIds],
  );


  const headerActions = useMemo<HeaderAction[]>(() => {
    if (selectedId) {
      return [];
    }
    const actions: HeaderAction[] = [
      {
        key: 'mark-all-read',
        icon: 'email-check-outline',
        onPress: () => {
          void markAllVisibleRead();
        },
        accessibilityLabel: 'Mark all visible app orders as read',
      },
      {
        key: 'view',
        icon: viewMode === 'list' ? 'view-grid-outline' : 'format-list-bulleted',
        onPress: toggleView,
        accessibilityLabel: 'Toggle list or card view',
      },
    ];
    if (selectedValidatable.length === 1) {
      actions.push({
        key: 'validate-delivery',
        icon: 'truck-check-outline',
        label: 'Validate',
        onPress: () => {
          openDeliveriesPage(selectedValidatable[0].id, selectedValidatable[0].number);
        },
        accessibilityLabel: 'Validate delivery for selected order',
      });
    } else if (selectedValidatable.length > 1) {
      actions.push({
        key: 'validate-delivery',
        icon: 'truck-check-outline',
        label: `Validate (${selectedValidatable.length})`,
        onPress: () => setBulkValidateVisible(true),
        accessibilityLabel: 'Validate delivery for selected orders',
      });
    }
    return actions;
  }, [
    selectedId,
    viewMode,
    toggleView,
    markAllVisibleRead,
    selectedValidatable,
    openDeliveriesPage,
  ]);

  useHeaderActions(headerActions);

  const showDateGroups = viewMode === 'list';
  const monthGroups = useMemo(
    () => (showDateGroups ? groupOrdersByMonthDay(filtered) : []),
    [showDateGroups, filtered],
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
  }, [query, viewMode, orderFilters, readFilter, groupByOrderDate]);

  const paged = useMemo(
    () =>
      showDateGroups
        ? filtered
        : filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage, showDateGroups],
  );

  const toggleGroupCollapsed = useCallback((key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

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
          onOpenDelivery={
            (detail?.deliveryCount ?? 0) > 0
              ? () => {
                  openDeliveriesPage(selectedId, detail?.number);
                }
              : undefined
          }
        />
        <Portal>
          <Dialog
            visible={createInvoiceVisible}
            onDismiss={() =>
              detailCreatingInvoice ? undefined : setCreateInvoiceVisible(false)
            }>
            <Dialog.Title>Create invoice?</Dialog.Title>
            <Dialog.Content>
              <Text>
                Create a customer invoice in Odoo for{' '}
                {detail?.number ?? 'this order'}?
              </Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button
                disabled={detailCreatingInvoice}
                onPress={() => setCreateInvoiceVisible(false)}>
                Cancel
              </Button>
              <Button
                mode="contained"
                loading={detailCreatingInvoice}
                disabled={detailCreatingInvoice}
                onPress={() => {
                  void handleCreateInvoice();
                }}>
                Create Invoice
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
        <PayInvoiceDialog
          visible={payInvoiceVisible}
          orderLabel={detail?.number}
          payableInvoice={detail?.payableInvoice}
          paymentMethods={paymentMethods}
          methodsLoading={paymentMethodsLoading}
          paying={detailPayingInvoice}
          onDismiss={() => setPayInvoiceVisible(false)}
          onConfirm={methodId => {
            void handlePayInvoice(methodId);
          }}
        />
        {printPreview ? (
          <SaleOrderPrintPreview
            detail={printPreview.detail}
            format={printPreview.format}
            documentLabel="APP ORDER"
            onClose={() => setPrintPreview(null)}
          />
        ) : null}
        <Snackbar
          visible={!!snackbar}
          onDismiss={() => setSnackbar('')}
          duration={3000}>
          {snackbar}
        </Snackbar>
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
        <View style={styles.groupChipBar}>
          <Chip compact selected icon="calendar-month" style={styles.readFilterChip}>
            Order Date: Month › Day
          </Chip>
        </View>
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
              {showDateGroups
                ? monthGroups.map(month => {
                    const monthCollapsed = collapsedGroups.has(`m:${month.key}`);
                    return (
                      <View key={month.key}>
                        <OrderDateGroupHeader
                          label={month.label}
                          count={month.count}
                          total={month.total}
                          collapsed={monthCollapsed}
                          depth={0}
                          onToggle={() => toggleGroupCollapsed(`m:${month.key}`)}
                        />
                        {!monthCollapsed
                          ? month.days.map(day => {
                              const dayCollapsed = collapsedGroups.has(
                                `d:${day.key}`,
                              );
                              return (
                                <View key={day.key}>
                                  <OrderDateGroupHeader
                                    label={day.label}
                                    count={day.count}
                                    total={day.total}
                                    collapsed={dayCollapsed}
                                    depth={1}
                                    onToggle={() =>
                                      toggleGroupCollapsed(`d:${day.key}`)
                                    }
                                  />
                                  {!dayCollapsed
                                    ? day.orders.map((item, index) => (
                                        <SaleOrderRow
                                          key={item.id}
                                          item={item}
                                          index={index}
                                          selected={selectedIds.has(item.id)}
                                          onToggle={toggleOne}
                                          onOpen={openDetail}
                                          onToggleRead={toggleRead}
                                          onValidateDelivery={id => {
                                            openDeliveriesPage(id, items.find(o => o.id === id)?.number);
                                          }}
                                          validating={detailValidatingDelivery}
                                        />
                                      ))
                                    : null}
                                </View>
                              );
                            })
                          : null}
                      </View>
                    );
                  })
                : paged.map((item, index) => (
                    <SaleOrderRow
                      key={item.id}
                      item={item}
                      index={index}
                      selected={selectedIds.has(item.id)}
                      onToggle={toggleOne}
                      onOpen={openDetail}
                      onToggleRead={toggleRead}
                      onValidateDelivery={id => {
                        openDeliveriesPage(id, items.find(o => o.id === id)?.number);
                      }}
                      validating={detailValidatingDelivery}
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
                onValidateDelivery={id => {
                  openDeliveriesPage(id, items.find(o => o.id === id)?.number);
                }}
                validating={detailValidatingDelivery}
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

      {showDateGroups ? (
        <View style={styles.groupedFooter}>
          <Text style={{ opacity: 0.7 }}>
            {filtered.length} order{filtered.length === 1 ? '' : 's'} · Grouped by
            Order Date (Month {'>'} Day)
          </Text>
        </View>
      ) : (
        <Pagination
          page={safePage}
          pageCount={pageCount}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          centerLabel={`${filtered.length} from Odoo`}
          itemLabel="order"
        />
      )}
      <Portal>
        <Dialog
          visible={bulkValidateVisible}
          onDismiss={() =>
            detailValidatingDelivery ? undefined : setBulkValidateVisible(false)
          }>
          <Dialog.Title>Validate delivery?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Validate delivery for {selectedValidatable.length} selected order
              {selectedValidatable.length === 1 ? '' : 's'}?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={detailValidatingDelivery}
              onPress={() => setBulkValidateVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={detailValidatingDelivery}
              disabled={detailValidatingDelivery}
              onPress={() => {
                void handleBulkValidateDelivery();
              }}>
              Validate
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}>
        {snackbar}
      </Snackbar>
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
  groupedFooter: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
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
  actionCell: {
    width: 44,
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
  groupChipBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
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
