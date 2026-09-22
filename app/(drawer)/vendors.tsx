import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Avatar,
  Checkbox,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';

import { ContactDetailView } from '@/components/contact/ContactDetailView';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { Pagination } from '@/components/ui/Pagination';
import { getContactStatusColors } from '@/constants/status-colors';
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
  fetchCustomerDetail,
  fetchCustomers,
  grantCustomerPortalAccess,
} from '@/services/customers';
import { Customer, CustomerDetail } from '@/types/customer';
import { asIdSet, useListUiCache } from '@/utils/list-ui-cache';
import { normalizeMyanmarPhone } from '@/utils/myanmar-phone';

const PAGE_SIZE = 50;
const CHECK_COL_WIDTH = 38;

type ViewMode = 'list' | 'card';

type VendorsListUi = {
  viewMode: ViewMode;
  selectedIds: string[];
};

type Column = {
  key: string;
  label: string;
  flex: number;
  minWidth: number;
  align?: 'left' | 'right';
};

const COLUMNS: Column[] = [
  { key: 'name', label: 'Name', flex: 2.2, minWidth: 168 },
  { key: 'phone', label: 'Phone', flex: 1.4, minWidth: 118 },
  { key: 'activity', label: 'Activity', flex: 1.2, minWidth: 96 },
  { key: 'township', label: 'Township', flex: 1.9, minWidth: 132 },
  { key: 'status', label: 'Status', flex: 1.4, minWidth: 108 },
  { key: 'lastMonthSales', label: 'Last Mo.', flex: 1.3, minWidth: 88, align: 'right' },
  { key: 'thisMonthSales', label: 'This Mo.', flex: 1.3, minWidth: 88, align: 'right' },
  { key: 'thisMonthPercent', label: '%', flex: 1.0, minWidth: 64, align: 'right' },
  { key: 'lastInvoiceDate', label: 'Last Invoice', flex: 1.5, minWidth: 110 },
];

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function toSafeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value: unknown) {
  return `${toSafeNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

function formatPercent(value: unknown) {
  const n = toSafeNumber(value);
  return n ? `${n.toFixed(2)}%` : '';
}

function formatDate(value: unknown) {
  if (!value || typeof value !== 'string') return '';
  const [year, month, day] = value.split(' ')[0].split('-').map(Number);
  if (!year || !month || !day) return value;
  return `${MONTHS[month - 1]} ${day}`;
}

function initials(name: string) {
  const parts = (name ?? '').trim().split(/\s+/).slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase() ?? '').join('') || '?';
}

function matchesVendorSearch(vendor: Customer, term: string): boolean {
  if (!term) return true;
  const phoneNorm = normalizeMyanmarPhone(term) ?? term;
  const haystack = [
    vendor.name,
    vendor.phone,
    vendor.email,
    vendor.township,
    vendor.status,
    vendor.activity,
  ]
    .join(' ')
    .toLowerCase();
  return (
    haystack.includes(term) ||
    (vendor.phone || '').includes(phoneNorm) ||
    (vendor.phone || '').includes(term)
  );
}

function StatusBadge({ status }: { status: string }) {
  const { mode } = useAppTheme();
  if (!status) {
    return <Text style={{ opacity: 0.5 }}>—</Text>;
  }
  const { bg, fg } = getContactStatusColors(mode, status);
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text
        variant="labelSmall"
        numberOfLines={1}
        style={{ color: fg, fontWeight: '600' }}>
        {status}
      </Text>
    </View>
  );
}

function cellValue(item: Customer, key: string): string {
  switch (key) {
    case 'name':
      return item.name;
    case 'phone':
      return item.phone;
    case 'activity':
      return item.activity || 'No Activity';
    case 'township':
      return item.township;
    case 'lastMonthSales':
      return formatMoney(item.lastMonthSales);
    case 'thisMonthSales':
      return formatMoney(item.thisMonthSales);
    case 'thisMonthPercent':
      return formatPercent(item.thisMonthPercent);
    case 'lastInvoiceDate':
      return formatDate(item.lastInvoiceDate);
    default:
      return '';
  }
}

function VendorRow({
  item,
  index,
  selected,
  onToggle,
  onOpen,
}: {
  item: Customer;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();
  const zebra =
    index % 2 === 0 ? theme.colors.surface : theme.colors.surfaceVariant;

  return (
    <Pressable
      onPress={() => onOpen(item.id)}
      style={[
        styles.row,
        {
          backgroundColor: selected ? theme.colors.primaryContainer : zebra,
          borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}>
      <View style={[styles.checkCell, { width: CHECK_COL_WIDTH }]}>
        <Checkbox
          status={selected ? 'checked' : 'unchecked'}
          onPress={() => onToggle(item.id)}
        />
      </View>
      {COLUMNS.map(col => (
        <View
          key={col.key}
          style={[
            styles.cell,
            { flex: col.flex, minWidth: col.minWidth },
            col.align === 'right' && styles.cellRight,
          ]}>
          {col.key === 'name' ? (
            <View style={styles.nameCell}>
              <Avatar.Text
                size={28}
                label={initials(item.name)}
                style={{ backgroundColor: theme.colors.secondaryContainer }}
                labelStyle={{
                  fontSize: 11,
                  color: theme.colors.onSecondaryContainer,
                }}
              />
              <Text numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>
                {item.name}
              </Text>
            </View>
          ) : col.key === 'status' ? (
            <StatusBadge status={item.status} />
          ) : (
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.onSurface,
                textAlign: col.align === 'right' ? 'right' : 'left',
              }}>
              {cellValue(item, col.key) || '—'}
            </Text>
          )}
        </View>
      ))}
    </Pressable>
  );
}

export default function VendorsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const { setDetailHeader } = useSearch();
  const { detailId: routeDetailId, created } = useLocalSearchParams<{
    detailId?: string;
    created?: string;
  }>();

  const [vendors, setVendors] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [portalBusy, setPortalBusy] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const listUiSnapshot = useMemo<VendorsListUi>(
    () => ({
      viewMode,
      selectedIds: [...selectedIds],
    }),
    [viewMode, selectedIds],
  );

  useListUiCache<VendorsListUi>('vendors-list', listUiSnapshot, saved => {
    if (saved.viewMode === 'list' || saved.viewMode === 'card') {
      setViewMode(saved.viewMode);
    }
    if (saved.selectedIds) {
      setSelectedIds(asIdSet(saved.selectedIds));
    }
  });

  const query = useModuleSearch('Search vendors by name or phone', !detailId);

  const load = useCallback(async () => {
    if (!session?.token) {
      setVendors([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchCustomers(session.token, { vendors: true });
      setVendors(data);
      setError('');
    } catch (err) {
      setVendors([]);
      setError(err instanceof Error ? err.message : 'Failed to load vendors.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (created === '1') {
      setSnackbar('Vendor created.');
    }
  }, [created]);

  useEffect(() => {
    if (routeDetailId && typeof routeDetailId === 'string') {
      setDetailId(routeDetailId);
    }
  }, [routeDetailId]);

  useEffect(() => {
    setPage(1);
  }, [query, viewMode]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const openCreate = useCallback(() => {
    router.push({
      pathname: '/contact-create',
      params: { mode: 'vendor' },
    } as unknown as Parameters<typeof router.push>[0]);
  }, [router]);

  const toggleView = useCallback(() => {
    setViewMode(prev => (prev === 'list' ? 'card' : 'list'));
  }, []);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetail(null);
    setDetailError('');
    setPortalBusy(false);
  }, []);

  const openDetail = useCallback(
    async (id: string) => {
      if (!session?.token) return;
      setDetailId(id);
      setDetailLoading(true);
      setDetailError('');
      setDetail(null);
      try {
        const data = await fetchCustomerDetail(session.token, id);
        setDetail(data);
      } catch (err) {
        setDetailError(
          err instanceof Error ? err.message : 'Failed to load vendor detail.',
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [session?.token],
  );

  useEffect(() => {
    if (!detailId || detail || detailLoading || detailError) return;
    void openDetail(detailId);
  }, [detailId, detail, detailLoading, detailError, openDetail]);

  const grantPortalAccess = useCallback(
    async (password: string) => {
      if (!session?.token || !detailId) {
        throw new Error('Not signed in.');
      }
      setPortalBusy(true);
      try {
        const portal = await grantCustomerPortalAccess(
          session.token,
          detailId,
          password,
        );
        setDetail(prev => (prev ? { ...prev, portalAccess: portal } : prev));
        setSnackbar('Portal access updated.');
      } finally {
        setPortalBusy(false);
      }
    },
    [session?.token, detailId],
  );

  useEffect(() => {
    if (!detailId) {
      setDetailHeader(null);
      return;
    }
    setDetailHeader({
      title: detail?.name ?? 'Vendor',
      onBack: closeDetail,
      breadcrumbParent: 'Vendors',
    });
    return () => setDetailHeader(null);
  }, [detailId, detail, closeDetail, setDetailHeader]);

  const headerActions = useMemo<HeaderAction[]>(() => {
    if (detailId) return [];
    return [
      {
        key: 'view',
        icon: viewMode === 'list' ? 'view-grid-outline' : 'format-list-bulleted',
        onPress: toggleView,
        accessibilityLabel: 'Toggle list or card view',
      },
      {
        key: 'create',
        icon: 'plus',
        onPress: openCreate,
        accessibilityLabel: 'Create new vendor',
      },
    ];
  }, [detailId, viewMode, toggleView, openCreate]);

  useHeaderActions(headerActions);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return vendors.filter(v => matchesVendorSearch(v, term));
  }, [vendors, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filtered, safePage],
  );

  const selectedOnPage = paged.reduce(
    (count, v) => count + (selectedIds.has(v.id) ? 1 : 0),
    0,
  );
  const headerStatus: 'checked' | 'unchecked' | 'indeterminate' =
    selectedOnPage === 0
      ? 'unchecked'
      : selectedOnPage === paged.length
        ? 'checked'
        : 'indeterminate';

  const toggleAllOnPage = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (headerStatus === 'checked') {
        paged.forEach(v => next.delete(v.id));
      } else {
        paged.forEach(v => next.add(v.id));
      }
      return next;
    });
  }, [headerStatus, paged]);

  if (detailId) {
    return (
        <ContactDetailView
          detail={detail}
          loading={detailLoading}
          error={detailError}
          portalBusy={portalBusy}
          onGrantPortalAccess={grantPortalAccess}
          onEditContact={() =>
            router.push({
              pathname: '/contact-edit',
              params: { id: detailId },
            } as unknown as Parameters<typeof router.push>[0])
          }
        />
    );
  }

  if (loading) {
    return <ListSkeleton variant="vendors" />;
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium">Could not load vendors</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {viewMode === 'list' ? (
        <View style={styles.tableScroll}>
          <View
            style={[
              styles.headerRow,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}>
            <View style={[styles.checkCell, { width: CHECK_COL_WIDTH }]}>
              <Checkbox
                status={headerStatus}
                onPress={toggleAllOnPage}
              />
            </View>
            {COLUMNS.map(col => (
              <View
                key={col.key}
                style={[
                  styles.cell,
                  { flex: col.flex, minWidth: col.minWidth },
                  col.align === 'right' && styles.cellRight,
                ]}>
                <Text
                  variant="labelSmall"
                  numberOfLines={1}
                  style={{
                    fontWeight: '700',
                    textAlign: col.align === 'right' ? 'right' : 'left',
                  }}>
                  {col.label}
                </Text>
              </View>
            ))}
          </View>
          <ScrollView
            style={styles.listBody}
            horizontal={!isDesktop}
            nestedScrollEnabled>
            <ScrollView
              style={{ minWidth: isDesktop ? undefined : 980 }}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              showsVerticalScrollIndicator={false}>
              {paged.length === 0 ? (
                <Text style={styles.empty}>
                  {query.trim()
                    ? `No vendors match "${query.trim()}".`
                    : 'No vendors found. Create one with +.'}
                </Text>
              ) : (
                paged.map((item, index) => (
                  <VendorRow
                    key={item.id}
                    item={item}
                    index={index}
                    selected={selectedIds.has(item.id)}
                    onToggle={toggleOne}
                    onOpen={openDetail}
                  />
                ))
              )}
            </ScrollView>
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.cardGrid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {paged.length === 0 ? (
            <Text style={styles.empty}>
              {query.trim()
                ? `No vendors match "${query.trim()}".`
                : 'No vendors found. Create one with +.'}
            </Text>
          ) : (
            paged.map(item => (
              <Pressable
                key={item.id}
                onPress={() => openDetail(item.id)}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
                    width: isDesktop ? '31%' : '100%',
                  },
                ]}>
                <View style={styles.nameCell}>
                  <Avatar.Text size={36} label={initials(item.name)} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ fontWeight: '700' }}>
                      {item.name}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{ color: theme.colors.onSurfaceVariant }}
                      numberOfLines={1}>
                      {item.phone || 'No phone'}
                    </Text>
                  </View>
                </View>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                  numberOfLines={1}>
                  {item.township || 'No township'}
                </Text>
                <StatusBadge status={item.status} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        itemLabel="vendor"
      />

      <Snackbar
        visible={Boolean(snackbar)}
        onDismiss={() => setSnackbar('')}
        duration={2500}>
        {snackbar}
      </Snackbar>
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
    gap: 8,
  },
  tableScroll: { flex: 1 },
  listBody: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  cellRight: {
    alignItems: 'flex-end',
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: '100%',
  },
  empty: {
    padding: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
});
