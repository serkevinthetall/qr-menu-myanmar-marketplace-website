import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Checkbox,
  Divider,
  Menu,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';

import { Pagination } from '@/components/ui/Pagination';
import { ContactDetailView } from '@/components/contact/ContactDetailView';
import {
  ContactFilterBar,
  ContactFilters,
  EMPTY_CONTACT_FILTERS,
  hasActiveContactFilters,
  matchesContactFilters,
} from '@/components/contact/ContactFilterBar';
import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/contexts/theme-context';
import { getContactStatusColors } from '@/constants/status-colors';
import {
  HeaderAction,
  useHeaderActions,
  useModuleFilters,
  useModuleSearch,
  useSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  ContactAppInstallFilters,
  NotInstalledReasonDialog,
  useContactAppInstall,
  type AppInstallFilter,
  type AppInstallRecord,
  type AppInstallStatus,
} from '@/features/app-install';
import { fetchCustomerDetail, fetchCustomers, fetchTownships } from '@/services/customers';
import { Customer, CustomerDetail, Township } from '@/types/customer';
import { asIdSet, useListUiCache } from '@/utils/list-ui-cache';
import { normalizeMyanmarPhone } from '@/utils/myanmar-phone';

const PAGE_SIZE = 50;

type ViewMode = 'list' | 'card';

type CustomersListUi = {
  viewMode: ViewMode;
  contactFilters: ContactFilters;
  selectedIds: string[];
  /** @temp-feature app-install-call-list */
  appInstallFilter: AppInstallFilter;
};

type Column = {
  key: string;
  label: string;
  flex: number;
  align?: 'left' | 'right';
};

const COLUMNS: Column[] = [
  { key: 'name', label: 'Name', flex: 2.2 },
  { key: 'phone', label: 'Phone', flex: 1.4 },
  { key: 'activity', label: 'Activity', flex: 1.2 },
  { key: 'township', label: 'Township', flex: 1.9 },
  { key: 'status', label: 'Status', flex: 2 },
  { key: 'lastMonthSales', label: 'Last Month', flex: 1.6, align: 'right' },
  { key: 'thisMonthSales', label: 'This Month', flex: 1.6, align: 'right' },
  { key: 'thisMonthPercent', label: 'Percentage', flex: 1.1, align: 'right' },
  { key: 'lastInvoiceDate', label: 'Last Invoice', flex: 1.1 },
  { key: 'expoPushToken', label: 'Expo Push', flex: 1.6 },
  /** @temp-feature app-install-call-list — Call List module (not App Order) */
  { key: 'appInstall', label: 'Install Call', flex: 2.4 },
  { key: 'createQuotation', label: 'Create Quotation', flex: 2.6 },
];

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toSafeNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function digitsOnly(value: string): string {
  return String(value ?? '').replace(/\D/g, '');
}

function matchesContactSearch(customer: Customer, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) {
    return true;
  }

  if (customer.name.toLowerCase().includes(needle)) {
    return true;
  }
  if (customer.township.toLowerCase().includes(needle)) {
    return true;
  }
  if (customer.phone.toLowerCase().includes(needle)) {
    return true;
  }

  const needleDigits = digitsOnly(needle);
  if (needleDigits.length >= 3) {
    const phoneDigits = digitsOnly(customer.phone);
    if (phoneDigits.includes(needleDigits)) {
      return true;
    }
    const normalizedPhone = normalizeMyanmarPhone(customer.phone);
    const normalizedNeedle = normalizeMyanmarPhone(needle);
    if (normalizedNeedle && normalizedPhone.includes(normalizedNeedle)) {
      return true;
    }
  }

  return false;
}

function formatMoney(value: unknown) {
  return `${toSafeNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

function formatPercent(value: unknown) {
  return `${toSafeNumber(value).toFixed(2)}%`;
}

function formatDate(value: unknown) {
  if (!value || typeof value !== 'string') {
    return '';
  }
  const [year, month, day] = value.split(' ')[0].split('-').map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return `${MONTHS[month - 1]} ${day}`;
}

function initials(name: string) {
  const parts = (name ?? '').trim().split(/\s+/).slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase() ?? '').join('') || '?';
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

function cellText(item: Customer, key: string): string {
  switch (key) {
    case 'name':
      return item.name;
    case 'phone':
      return item.phone;
    case 'activity':
      return item.activity;
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
    case 'expoPushToken':
      return item.expoPushToken;
    default:
      return '';
  }
}

function appInstallColors(status?: AppInstallStatus): { bg: string; fg: string } {
  switch (status) {
    case 'installed':
      return { bg: 'rgba(16, 185, 129, 0.18)', fg: '#047857' };
    case 'waiting':
      return { bg: 'rgba(59, 130, 246, 0.16)', fg: '#1D4ED8' };
    case 'not_installed':
      return { bg: 'rgba(245, 158, 11, 0.2)', fg: '#B45309' };
    default:
      return { bg: 'rgba(148, 163, 184, 0.2)', fg: '#475569' };
  }
}

function ContactRow({
  item,
  index,
  selected,
  columns,
  install,
  busy,
  onToggle,
  onOpen,
  onCreateQuotation,
  onRequestInstall,
  onMarkInstalled,
  onMarkNotInstalled,
  onMarkWaiting,
  onRemoveFromCallList,
}: {
  item: Customer;
  index: number;
  selected: boolean;
  columns: Column[];
  install?: AppInstallRecord;
  busy?: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onCreateQuotation: (id: string) => void;
  onRequestInstall?: (id: string) => void;
  onMarkInstalled?: (id: string) => void;
  onMarkNotInstalled?: (id: string) => void;
  onMarkWaiting?: (id: string) => void;
  onRemoveFromCallList?: (id: string) => void;
}) {
  const theme = useTheme();
  const zebra = index % 2 === 1;
  const [menuOpen, setMenuOpen] = useState(false);
  const installColors = appInstallColors(install?.status);

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: selected
            ? theme.colors.primaryContainer
            : zebra
              ? theme.colors.surfaceVariant
              : theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}>
      <View style={styles.checkCell}>
        <Checkbox
          status={selected ? 'checked' : 'unchecked'}
          onPress={() => onToggle(item.id)}
        />
      </View>
      {columns.map(col => {
        if (col.key === 'name') {
          return (
            <Pressable
              key={col.key}
              style={[styles.cell, { flex: col.flex }]}
              onPress={() => onOpen(item.id)}>
              <View style={styles.nameCell}>
                <Avatar.Text
                  size={26}
                  label={initials(item.name)}
                  style={{ backgroundColor: theme.colors.secondaryContainer }}
                  labelStyle={{
                    fontSize: 11,
                    color: theme.colors.onSecondaryContainer,
                  }}
                />
                <Text numberOfLines={1} style={styles.nameText}>
                  {item.name}
                </Text>
              </View>
            </Pressable>
          );
        }

        if (col.key === 'status') {
          return (
            <Pressable
              key={col.key}
              style={[styles.cell, { flex: col.flex }]}
              onPress={() => onOpen(item.id)}>
              <StatusBadge status={item.status} />
            </Pressable>
          );
        }

        if (col.key === 'appInstall') {
          return (
            <View key={col.key} style={[styles.cell, styles.actionCell, { flex: col.flex }]}>
              {install ? (
                <Menu
                  visible={menuOpen}
                  onDismiss={() => setMenuOpen(false)}
                  anchor={
                    <Button
                      compact
                      mode="outlined"
                      loading={busy}
                      disabled={busy}
                      onPress={() => setMenuOpen(true)}
                      style={[
                        styles.rowActionBtn,
                        { borderColor: installColors.fg, backgroundColor: installColors.bg },
                      ]}
                      labelStyle={[styles.rowActionLabel, { color: installColors.fg }]}
                      contentStyle={styles.rowActionContent}>
                      {install.statusLabel}
                    </Button>
                  }>
                  <Menu.Item
                    title="Not installed…"
                    onPress={() => {
                      setMenuOpen(false);
                      setTimeout(() => onMarkNotInstalled?.(item.id), 0);
                    }}
                  />
                  <Menu.Item
                    title="Waiting"
                    onPress={() => {
                      setMenuOpen(false);
                      setTimeout(() => onMarkWaiting?.(item.id), 0);
                    }}
                  />
                  <Menu.Item
                    title="Installed"
                    onPress={() => {
                      setMenuOpen(false);
                      setTimeout(() => onMarkInstalled?.(item.id), 0);
                    }}
                  />
                  <Menu.Item
                    title="Remove from list"
                    onPress={() => {
                      setMenuOpen(false);
                      setTimeout(() => onRemoveFromCallList?.(item.id), 0);
                    }}
                  />
                </Menu>
              ) : (
                <Button
                  compact
                  mode="outlined"
                  icon="cellphone-arrow-down"
                  loading={busy}
                  disabled={busy}
                  onPress={() => onRequestInstall?.(item.id)}
                  style={[
                    styles.rowActionBtn,
                    {
                      borderColor: theme.colors.outline,
                      backgroundColor: theme.colors.surface,
                    },
                  ]}
                  textColor={theme.colors.primary}
                  labelStyle={styles.rowActionLabel}
                  contentStyle={styles.rowActionContent}>
                  Request
                </Button>
              )}
            </View>
          );
        }

        if (col.key === 'createQuotation') {
          return (
            <View key={col.key} style={[styles.cell, styles.actionCell, { flex: col.flex }]}>
              <Button
                compact
                mode="outlined"
                icon="file-document-plus-outline"
                onPress={() => onCreateQuotation(item.id)}
                style={[
                  styles.rowActionBtn,
                  styles.rowActionBtnPrimary,
                  {
                    borderColor: theme.colors.primary,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
                textColor={theme.colors.primary}
                labelStyle={styles.rowActionLabel}
                contentStyle={styles.rowActionContent}>
                Create Quotation
              </Button>
            </View>
          );
        }

        const text = cellText(item, col.key);
        return (
          <Pressable
            key={col.key}
            style={[styles.cell, { flex: col.flex }]}
            onPress={() => onOpen(item.id)}>
            <Text
              numberOfLines={1}
              style={{
                textAlign: col.align === 'right' ? 'right' : 'left',
                color: text ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
              }}>
              {text || '—'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TableHeader({
  status,
  columns,
  onToggleAll,
}: {
  status: 'checked' | 'unchecked' | 'indeterminate';
  columns: Column[];
  onToggleAll: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        styles.headerRow,
        {
          backgroundColor: theme.colors.primary,
          borderBottomColor: theme.colors.primary,
        },
      ]}>
      <View style={styles.checkCell}>
        <Checkbox
          status={status}
          onPress={onToggleAll}
          color={theme.colors.onPrimary}
          uncheckedColor={theme.colors.onPrimary}
        />
      </View>
      {columns.map(col => (
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

function CustomerCard({
  item,
  onOpen,
}: {
  item: Customer;
  onOpen: (id: string) => void;
}) {
  const theme = useTheme();

  return (
    <Pressable onPress={() => onOpen(item.id)}>
      <Card
        mode="elevated"
        style={[
          styles.customerCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Avatar.Text
            size={40}
            label={initials(item.name)}
            style={{ backgroundColor: theme.colors.secondaryContainer }}
            labelStyle={{ color: theme.colors.onSecondaryContainer }}
          />
          <View style={styles.nameBox}>
            <Text variant="titleMedium" style={styles.cardName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.township ? (
              <Text
                variant="bodySmall"
                numberOfLines={1}
                style={{ color: theme.colors.onSurfaceVariant }}>
                📍 {item.township}
              </Text>
            ) : null}
          </View>
        </View>

        {item.status ? <StatusBadge status={item.status} /> : null}

        <View style={styles.salesRow}>
          <View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Last Month
            </Text>
            <Text variant="titleSmall" style={{ fontWeight: '600' }}>
              {formatMoney(item.lastMonthSales)}
            </Text>
          </View>
          <View style={styles.alignEnd}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              This Month
            </Text>
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {formatMoney(item.thisMonthSales)}
            </Text>
          </View>
        </View>

        <Divider />

        <View style={styles.metaRows}>
          {item.phone ? <Text variant="bodySmall">📞 {item.phone}</Text> : null}
          {item.activity ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              🗓 {item.activity}
            </Text>
          ) : null}
          {item.lastInvoiceDate ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              🧾 Last invoice: {formatDate(item.lastInvoiceDate)}
            </Text>
          ) : null}
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            📈 {formatPercent(item.thisMonthPercent)}
          </Text>
        </View>
      </Card.Content>
      </Card>
    </Pressable>
  );
}

export default function CustomersScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const router = useRouter();
  const { detailId: routeDetailId, created } = useLocalSearchParams<{
    detailId?: string;
    created?: string;
  }>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [townshipOptions, setTownshipOptions] = useState<Township[]>([]);
  const [snackbar, setSnackbar] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contactFilters, setContactFilters] = useState<ContactFilters>(
    EMPTY_CONTACT_FILTERS,
  );
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // @temp-feature app-install-call-list — remove this hook when dropping the campaign
  const appInstall = useContactAppInstall(session?.token);

  const tableColumns = useMemo(
    () =>
      appInstall.enabled
        ? COLUMNS
        : COLUMNS.filter(col => col.key !== 'appInstall'),
    [appInstall.enabled],
  );

  const listUiSnapshot = useMemo<CustomersListUi>(
    () => ({
      viewMode,
      contactFilters,
      selectedIds: [...selectedIds],
      appInstallFilter: appInstall.appInstallFilter,
    }),
    [viewMode, contactFilters, selectedIds, appInstall.appInstallFilter],
  );

  useListUiCache<CustomersListUi>('customers', listUiSnapshot, saved => {
    if (saved.viewMode === 'list' || saved.viewMode === 'card') {
      setViewMode(saved.viewMode);
    }
    if (saved.contactFilters && typeof saved.contactFilters === 'object') {
      setContactFilters({
        ...EMPTY_CONTACT_FILTERS,
        ...saved.contactFilters,
      });
    }
    if (saved.selectedIds) {
      setSelectedIds(asIdSet(saved.selectedIds));
    }
    if (
      appInstall.enabled &&
      (saved.appInstallFilter === 'all' ||
        saved.appInstallFilter === 'none' ||
        saved.appInstallFilter === 'not_installed' ||
        saved.appInstallFilter === 'waiting' ||
        saved.appInstallFilter === 'installed')
    ) {
      appInstall.setAppInstallFilter(saved.appInstallFilter);
    }
  });

  const query = useModuleSearch('Search contacts by name or phone', !detailId);
  const { setDetailHeader } = useSearch();

  const townships = useMemo(() => {
    if (townshipOptions.length > 0) {
      return townshipOptions
        .map(township => township.name)
        .sort((a, b) => a.localeCompare(b));
    }

    return [...new Set(customers.map(customer => customer.township).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b),
    );
  }, [townshipOptions, customers]);

  const filterPanel = useMemo(
    () => (
      <View style={{ gap: 8 }}>
        {appInstall.enabled ? (
          <ContactAppInstallFilters
            value={appInstall.appInstallFilter}
            onChange={appInstall.setAppInstallFilter}
          />
        ) : null}
        <ContactFilterBar
          filters={contactFilters}
          townships={townships}
          onChange={setContactFilters}
        />
      </View>
    ),
    [
      contactFilters,
      townships,
      appInstall.enabled,
      appInstall.appInstallFilter,
      appInstall.setAppInstallFilter,
    ],
  );

  useModuleFilters(filterPanel);

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

  const toggleView = useCallback(() => {
    setViewMode(prev => (prev === 'list' ? 'card' : 'list'));
  }, []);

  const openCreate = useCallback(() => {
    router.push('/contact-create');
  }, [router]);

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetail(null);
    setDetailError('');
  }, []);

  const openDetail = useCallback(
    async (id: string) => {
      if (id.startsWith('local-')) {
        setSnackbar('Detail is not available for local contacts yet.');
        return;
      }
      if (!session?.token) {
        return;
      }

      setDetailId(id);
      setDetailLoading(true);
      setDetailError('');
      setDetail(null);

      try {
        const data = await fetchCustomerDetail(session.token, id);
        setDetail(data);
      } catch (err) {
        setDetailError(
          err instanceof Error ? err.message : 'Failed to load contact detail.',
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [session?.token],
  );

  const navigateToCreateQuotation = useCallback(
    (customerId: string) => {
      if (customerId.startsWith('local-')) {
        setSnackbar('Cannot create Odoo quotation for a local contact.');
        return;
      }
      router.push({
        pathname: '/',
        params: { createForCustomerId: customerId },
      });
    },
    [router],
  );

  const createQuotationForContact = useCallback(() => {
    if (!detailId) {
      return;
    }
    const customerId = detailId;
    closeDetail();
    navigateToCreateQuotation(customerId);
  }, [detailId, closeDetail, navigateToCreateQuotation]);

  useEffect(() => {
    if (!detailId) {
      setDetailHeader(null);
      return;
    }

    setDetailHeader({
      title: detail?.name ?? 'Contact',
      onBack: closeDetail,
      breadcrumbParent: 'Contacts',
      onCreateQuotation: createQuotationForContact,
    });

    return () => setDetailHeader(null);
  }, [detailId, detail, closeDetail, createQuotationForContact, setDetailHeader]);

  const headerActions = useMemo<HeaderAction[]>(() => {
    if (detailId) {
      return [];
    }

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
        accessibilityLabel: 'Create new contact',
      },
    ];
  }, [detailId, viewMode, toggleView, openCreate]);

  useHeaderActions(headerActions);

  const filteredCustomers = useMemo(() => {
    const term = query.trim().toLowerCase();
    return customers.filter(customer => {
      if (!matchesContactFilters(customer, contactFilters)) {
        return false;
      }
      if (!appInstall.matchesInstallFilter(customer.id)) {
        return false;
      }
      if (!term) {
        return true;
      }
      return matchesContactSearch(customer, term);
    });
  }, [customers, query, contactFilters, appInstall.matchesInstallFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [query, viewMode, contactFilters, appInstall.appInstallFilter]);

  const pagedCustomers = useMemo(
    () => filteredCustomers.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredCustomers, safePage],
  );

  const selectedOnPage = pagedCustomers.reduce(
    (count, customer) => count + (selectedIds.has(customer.id) ? 1 : 0),
    0,
  );
  const headerStatus: 'checked' | 'unchecked' | 'indeterminate' =
    selectedOnPage === 0
      ? 'unchecked'
      : selectedOnPage === pagedCustomers.length
        ? 'checked'
        : 'indeterminate';

  const toggleAllOnPage = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const ids = pagedCustomers.map(customer => customer.id);
      const allSelected = ids.length > 0 && ids.every(id => next.has(id));
      ids.forEach(id => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }, [pagedCustomers]);

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

  const loadTownships = useCallback(async () => {
    if (!session?.token) {
      return;
    }

    try {
      const data = await fetchTownships(session.token);
      setTownshipOptions(data);
    } catch {
      // Keep contact-derived township names as fallback.
    }
  }, [session?.token]);

  const loadCustomers = useCallback(async () => {
    if (!session?.token) {
      return;
    }

    try {
      setError('');
      const data = await fetchCustomers(session.token);
      setCustomers(data);
      await appInstall.loadInstallMap();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts.');
    }
  }, [session?.token, appInstall.loadInstallMap]);

  useEffect(() => {
    if (appInstall.message) {
      setSnackbar(appInstall.message);
      appInstall.setMessage('');
    }
  }, [appInstall.message, appInstall.setMessage]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCustomers(), loadTownships()]).finally(() => setLoading(false));
  }, [loadCustomers, loadTownships]);

  useEffect(() => {
    if (!routeDetailId || !session?.token) {
      return;
    }

    if (created === '1') {
      loadCustomers();
      setSnackbar('Contact created in Odoo.');
    }

    openDetail(String(routeDetailId));
  }, [routeDetailId, created, session?.token, openDetail, loadCustomers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCustomers(), loadTownships()]);
    setRefreshing(false);
  };

  if (detailId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ContactDetailView
          detail={detail}
          loading={detailLoading}
          error={detailError}
        />
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
        <Text style={{ marginTop: 12 }}>Loading contacts from Odoo...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium" style={styles.errorTitle}>
          Could not load contacts
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
        filteredCustomers.length === 0 ? (
          <ScrollView
            style={styles.tableScroll}
            contentContainerStyle={styles.tableEmptyContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            <Text style={styles.empty}>
              {query.trim() ||
              hasActiveContactFilters(contactFilters) ||
              (appInstall.enabled && appInstall.appInstallFilter !== 'all')
                ? 'No contacts match your search or filters.'
                : 'No contacts found in Odoo.'}
            </Text>
          </ScrollView>
        ) : (
          <View style={styles.tableScroll}>
            <TableHeader
              status={headerStatus}
              columns={tableColumns}
              onToggleAll={toggleAllOnPage}
            />
            <ScrollView
              style={styles.listBody}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }>
              {pagedCustomers.map((item, index) => (
                <ContactRow
                  key={item.id}
                  item={item}
                  index={index}
                  selected={selectedIds.has(item.id)}
                  columns={tableColumns}
                  install={
                    appInstall.enabled
                      ? appInstall.installMap[item.id]
                      : undefined
                  }
                  busy={appInstall.installBusyId === item.id}
                  onToggle={toggleOne}
                  onOpen={openDetail}
                  onCreateQuotation={navigateToCreateQuotation}
                  onRequestInstall={
                    appInstall.enabled
                      ? appInstall.handleRequestInstall
                      : undefined
                  }
                  onMarkInstalled={
                    appInstall.enabled
                      ? appInstall.handleMarkInstalled
                      : undefined
                  }
                  onMarkNotInstalled={
                    appInstall.enabled
                      ? appInstall.handleMarkNotInstalled
                      : undefined
                  }
                  onMarkWaiting={
                    appInstall.enabled ? appInstall.handleMarkWaiting : undefined
                  }
                  onRemoveFromCallList={
                    appInstall.enabled
                      ? appInstall.handleRemoveFromCallList
                      : undefined
                  }
                />
              ))}
            </ScrollView>
          </View>
        )
      ) : (
        <FlatList
          key={numColumns}
          data={pagedCustomers}
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
              <CustomerCard item={item} onOpen={openDetail} />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim() ||
              hasActiveContactFilters(contactFilters) ||
              (appInstall.enabled && appInstall.appInstallFilter !== 'all')
                ? 'No contacts match your search or filters.'
                : 'No contacts found in Odoo.'}
            </Text>
          }
        />
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={filteredCustomers.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        centerLabel={`${customers.length} from Odoo`}
      />

      {appInstall.enabled ? (
        <NotInstalledReasonDialog
          visible={Boolean(appInstall.reasonForId)}
          onDismiss={() => appInstall.setReasonForId(null)}
          onSelect={reason => {
            void appInstall.confirmNotInstalledReason(reason);
          }}
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
  table: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  headerRow: {
    minHeight: 44,
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    minWidth: 0,
  },
  checkCell: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 0.8 }],
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    flex: 1,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: '100%',
  },
  actionCell: {
    alignItems: 'flex-start',
  },
  rowActionBtn: {
    borderRadius: 6,
    minWidth: 0,
    borderWidth: 1,
  },
  rowActionBtnPrimary: {
    borderWidth: 1.5,
  },
  rowActionContent: {
    height: 30,
    paddingHorizontal: 6,
  },
  rowActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
    marginVertical: 0,
    marginHorizontal: 4,
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
  customerCard: {
    borderRadius: 12,
    borderWidth: 1,
  },
  cardContent: {
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nameBox: {
    flex: 1,
  },
  cardName: {
    fontWeight: '600',
  },
  salesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  metaRows: {
    gap: 4,
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
