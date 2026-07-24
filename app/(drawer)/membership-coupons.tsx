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
  Text,
  useTheme,
} from 'react-native-paper';

import { MembershipCouponDetailView } from '@/components/membership/MembershipCouponDetailView';
import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { Pagination } from '@/components/ui/Pagination';
import { ThemeMode } from '@/constants/colors';
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
  fetchMembershipCouponDetail,
  fetchMembershipCoupons,
} from '@/services/membership-coupons';
import { MembershipCouponTicket } from '@/types/membership';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

const PAGE_SIZE = 50;

type ViewMode = 'list' | 'card';

type Column = {
  key: string;
  label: string;
  flex: number;
  align?: 'left' | 'right';
};

const COLUMNS: Column[] = [
  { key: 'name', label: 'Coupon', flex: 1.5 },
  { key: 'usedDate', label: 'Used Date', flex: 1.3 },
  { key: 'customer', label: 'Customer', flex: 2.0 },
  { key: 'couponCode', label: 'Code', flex: 1.4 },
  { key: 'amount', label: 'Amount', flex: 1.4, align: 'right' },
  { key: 'status', label: 'Status', flex: 1.3 },
];

function formatMoney(value: number): string {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} MMK`;
}

function getCouponStatusColors(
  mode: ThemeMode,
  status: string,
): { label: string; bg: string; fg: string } {
  const value = status.trim().toLowerCase();
  const label = status.trim() || '—';

  if (mode === 'dark') {
    if (value.includes('used') || value.includes('redeem')) {
      return { label, bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' };
    }
    if (value.includes('expire') || value.includes('cancel') || value.includes('void')) {
      return { label, bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' };
    }
    if (
      value.includes('unused') ||
      value.includes('new') ||
      value.includes('valid') ||
      value.includes('available')
    ) {
      return { label, bg: '#1E3A5F', fg: '#93C5FD' };
    }
    return { label, bg: '#334155', fg: '#CBD5E1' };
  }

  if (value.includes('used') || value.includes('redeem')) {
    return { label, bg: '#DCFCE7', fg: '#166534' };
  }
  if (value.includes('expire') || value.includes('cancel') || value.includes('void')) {
    return { label, bg: '#FEE2E2', fg: '#991B1B' };
  }
  if (
    value.includes('unused') ||
    value.includes('new') ||
    value.includes('valid') ||
    value.includes('available')
  ) {
    return { label, bg: '#DBEAFE', fg: '#1E40AF' };
  }
  return { label, bg: '#E2E8F0', fg: '#475569' };
}

function StatusBadge({ status }: { status: string }) {
  const { mode } = useAppTheme();
  const { label, bg, fg } = getCouponStatusColors(mode, status);

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

function cellText(item: MembershipCouponTicket, key: string): string {
  switch (key) {
    case 'name':
      return item.name;
    case 'usedDate':
      return formatMyanmarDate(item.usedDate) || item.usedDate;
    case 'customer':
      return item.customer;
    case 'couponCode':
      return item.couponCode;
    case 'amount':
      return formatMoney(item.couponAmount);
    default:
      return '';
  }
}

function CouponRow({
  item,
  index,
  onOpen,
}: {
  item: MembershipCouponTicket;
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
        const isName = col.key === 'name';
        const isCustomer = col.key === 'customer';

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
                  fontWeight: isName ? '600' : '400',
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

function CouponCard({
  item,
  onOpen,
}: {
  item: MembershipCouponTicket;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();

  return (
    <Card
      mode="elevated"
      onPress={() => onOpen(item.id)}
      style={[
        styles.couponCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text variant="titleMedium" style={styles.cardName} numberOfLines={1}>
            {item.name || item.couponCode || '—'}
          </Text>
          <StatusBadge status={item.status} />
        </View>

        <CustomerNameText>{item.customer?.trim() || '—'}</CustomerNameText>

        {item.couponCode || item.membership ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
            numberOfLines={1}>
            {[item.couponCode, item.membership].filter(Boolean).join(' · ')}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatMyanmarDate(item.usedDate) || item.usedDate || '—'}
          </Text>
          <Text
            variant="titleSmall"
            style={{ color: theme.colors.primary, fontWeight: '700' }}>
            {formatMoney(item.couponAmount)}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function MembershipCouponsScreen() {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const [items, setItems] = useState<MembershipCouponTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MembershipCouponTicket | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const query = useModuleSearch('Search coupon tickets', !selectedId);
  const { setDetailHeader } = useSearch();

  const load = useCallback(async () => {
    if (!session?.token) return;
    setError('');
    try {
      const data = await fetchMembershipCoupons(session.token, {
        q: query.trim() || undefined,
        limit: 300,
      });
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load membership coupon tickets.',
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
        const data = await fetchMembershipCouponDetail(session.token, id);
        setDetail(data);
      } catch (err) {
        setDetailError(
          err instanceof Error
            ? err.message
            : 'Failed to load coupon ticket.',
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
      title: detail?.name || detail?.couponCode || 'Coupon ticket',
      onBack: closeDetail,
      statusLabel: detail
        ? getCouponStatusColors(mode, detail.status).label
        : undefined,
      breadcrumbParent: 'Membership Coupons',
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
        <MembershipCouponDetailView
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
        <Text style={{ marginTop: 12 }}>Loading coupon tickets...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium" style={styles.errorTitle}>
          Could not load coupon tickets
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
                ? 'No coupon tickets match your search.'
                : 'No coupon tickets found in Odoo.'}
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
                <CouponRow
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
              <CouponCard item={item} onOpen={openDetail} />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim()
                ? 'No coupon tickets match your search.'
                : 'No coupon tickets found in Odoo.'}
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
  customerCell: {
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
  couponCard: {
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
  cardName: {
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
});
