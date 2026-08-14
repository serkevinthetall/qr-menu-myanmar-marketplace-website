/**
 * @temp-feature app-install-call-list
 *
 * Standalone Call List module for phone-app install follow-ups.
 * Does NOT use App Order / online-orders unread, alerts, or Redis read state.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Chip,
  Dialog,
  Menu,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { CalendarField } from '@/components/ui/CalendarField';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleFilters,
  useModuleSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  APP_INSTALL_REASON_OPTIONS,
  APP_INSTALL_STATUS_OPTIONS,
  APP_USER_LIST_DATE_PERIOD_OPTIONS,
  EMPTY_APP_USER_LIST_DATE_FILTERS,
  ENABLE_APP_INSTALL_CALL_LIST,
  exportCallListExcel,
  fetchCallList,
  hasAppUserListDateFilters,
  matchesAppUserListDateFilters,
  removeFromCallList,
  updateAppInstallStatus,
  type AppInstallReason,
  type AppInstallRecord,
  type AppInstallStatus,
  type AppUserListDateFilters,
} from '@/features/app-install';
import { useListUiCache } from '@/utils/list-ui-cache';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';
import { toTelUri } from '@/utils/myanmar-phone';

const PAGE_SIZE = 50;

type ViewMode = 'list' | 'grid';

type CallListUi = {
  viewMode: ViewMode;
  statusFilter: AppInstallStatus | 'all';
  dateFilters: AppUserListDateFilters;
};

function statusColor(status: AppInstallStatus): { bg: string; fg: string } {
  switch (status) {
    case 'installed':
      return { bg: 'rgba(16, 185, 129, 0.18)', fg: '#047857' };
    case 'waiting':
      return { bg: 'rgba(59, 130, 246, 0.16)', fg: '#1D4ED8' };
    case 'not_pick_up':
      return { bg: 'rgba(244, 63, 94, 0.16)', fg: '#BE123C' };
    case 'please_come_and_install':
      return { bg: 'rgba(168, 85, 247, 0.16)', fg: '#7E22CE' };
    case 'new':
      return { bg: 'rgba(20, 184, 166, 0.18)', fg: '#0F766E' };
    case 'not_installed':
    default:
      return { bg: 'rgba(245, 158, 11, 0.2)', fg: '#B45309' };
  }
}

function PhoneCallLink({
  phone,
  style,
}: {
  phone: string;
  style?: object;
}) {
  const theme = useTheme();
  const trimmed = phone.trim();

  if (!trimmed) {
    return (
      <Text style={[{ color: theme.colors.onSurfaceVariant }, style]}>
        No phone
      </Text>
    );
  }

  const telUri = toTelUri(trimmed);
  return (
    <Text
      accessibilityRole="link"
      accessibilityLabel={`Call ${trimmed}`}
      onPress={() => {
        if (!telUri) return;
        void Linking.openURL(telUri);
      }}
      style={[
        {
          color: theme.colors.primary,
          textDecorationLine: 'underline',
          fontWeight: '600',
        },
        style,
      ]}
      numberOfLines={1}>
      {trimmed}
    </Text>
  );
}

function StatusChip({ item }: { item: AppInstallRecord }) {
  const colors = statusColor(item.status);
  return (
    <View style={styles.badgeRow}>
      <View style={[styles.badge, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.fg, fontWeight: '700', fontSize: 12 }}>
          {item.statusLabel}
        </Text>
      </View>
      {item.reasonLabel ? (
        <Text style={styles.reasonHint} numberOfLines={1}>
          {item.reasonLabel}
        </Text>
      ) : null}
    </View>
  );
}

function UpdateMenu({
  open,
  busy,
  onOpen,
  onClose,
  onStatus,
  onNotInstalled,
  onWaiting,
  onRemove,
}: {
  open: boolean;
  busy: boolean;
  onOpen: () => void;
  onClose: () => void;
  onStatus: (status: AppInstallStatus) => void;
  onNotInstalled: () => void;
  onWaiting: () => void;
  onRemove: () => void;
}) {
  /** Paper Menu on web often dismisses before onPress finishes — defer work. */
  const runAfterClose = (action: () => void) => {
    onClose();
    setTimeout(action, 0);
  };

  return (
    <Menu
      key={open ? 'open' : 'closed'}
      visible={open}
      onDismiss={onClose}
      anchor={
        <Button
          compact
          mode="outlined"
          loading={busy}
          disabled={busy}
          onPress={onOpen}
          style={styles.updateBtn}
          labelStyle={styles.updateBtnLabel}
          contentStyle={styles.updateBtnContent}>
          Update
        </Button>
      }>
      <Menu.Item
        onPress={() => runAfterClose(() => onStatus('new'))}
        title="New"
      />
      <Menu.Item
        onPress={() => runAfterClose(onNotInstalled)}
        title="Not installed…"
      />
      <Menu.Item
        onPress={() => runAfterClose(onWaiting)}
        title="Waiting…"
      />
      <Menu.Item
        onPress={() => runAfterClose(() => onStatus('not_pick_up'))}
        title="Not pick up"
      />
      <Menu.Item
        onPress={() => runAfterClose(() => onStatus('please_come_and_install'))}
        title="Onsite install"
      />
      <Menu.Item
        onPress={() => runAfterClose(() => onStatus('installed'))}
        title="Installed"
      />
      <Menu.Item
        onPress={() => runAfterClose(onRemove)}
        title="Remove from App User List"
      />
    </Menu>
  );
}

function CallListRow({
  item,
  index,
  menuOpen,
  busy,
  onOpenMenu,
  onCloseMenu,
  onStatus,
  onNotInstalled,
  onWaiting,
  onRemove,
}: {
  item: AppInstallRecord;
  index: number;
  menuOpen: boolean;
  busy: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onStatus: (status: AppInstallStatus) => void;
  onNotInstalled: () => void;
  onWaiting: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const zebra = index % 2 === 1;

  return (
    <View
      style={[
        styles.listRow,
        {
          backgroundColor: zebra
            ? theme.colors.surfaceVariant
            : theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}>
      <View style={styles.listMain}>
        <View style={styles.nameWithBadge}>
          <Text style={styles.listName} numberOfLines={1}>
            {item.name || '—'}
          </Text>
          {(item.appOrderCount ?? 0) > 0 ? (
            <View
              style={[
                styles.appOrderBadge,
                { backgroundColor: theme.colors.primaryContainer },
              ]}
              accessibilityLabel={`${item.appOrderCount} app order${
                item.appOrderCount === 1 ? '' : 's'
              }${
                item.lastAppOrderNumber
                  ? `, last ${item.lastAppOrderNumber}`
                  : ''
              }`}>
              <Text
                style={[
                  styles.appOrderBadgeText,
                  { color: theme.colors.onPrimaryContainer },
                ]}>
                {item.appOrderCount}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.listMetaRow}>
          <PhoneCallLink phone={item.phone} style={{ fontSize: 13 }} />
          {item.township ? (
            <Text
              style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}
              numberOfLines={1}>
              {' · '}
              {item.township}
            </Text>
          ) : null}
        </View>
        {(item.appOrderCount ?? 0) > 0 &&
        (item.lastAppOrderNumber || item.lastAppOrderDate) ? (
          <Text
            style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            numberOfLines={1}>
            App Order{' '}
            {item.lastAppOrderNumber || '—'}
            {item.lastAppOrderDate
              ? ` · ${
                  formatMyanmarDateTime(item.lastAppOrderDate) ||
                  item.lastAppOrderDate
                }`
              : ''}
          </Text>
        ) : null}
        {item.requestedAt ? (
          <Text
            style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
            numberOfLines={1}>
            Created{' '}
            {formatMyanmarDateTime(item.requestedAt) || item.requestedAt}
          </Text>
        ) : null}
      </View>
      <View style={styles.listStatus}>
        <StatusChip item={item} />
      </View>
      <View style={styles.listActions}>
        <UpdateMenu
          open={menuOpen}
          busy={busy}
          onOpen={onOpenMenu}
          onClose={onCloseMenu}
          onStatus={onStatus}
          onNotInstalled={onNotInstalled}
          onWaiting={onWaiting}
          onRemove={onRemove}
        />
        <Button
          compact
          mode="text"
          disabled={busy}
          onPress={onRemove}
          textColor={theme.colors.error}
          labelStyle={styles.updateBtnLabel}
          contentStyle={styles.updateBtnContent}>
          Remove
        </Button>
      </View>
    </View>
  );
}

function CallListCard({
  item,
  menuOpen,
  busy,
  onOpenMenu,
  onCloseMenu,
  onStatus,
  onNotInstalled,
  onWaiting,
  onRemove,
}: {
  item: AppInstallRecord;
  menuOpen: boolean;
  busy: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onStatus: (status: AppInstallStatus) => void;
  onNotInstalled: () => void;
  onWaiting: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.gridCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}>
      <View style={styles.nameWithBadge}>
        <Text style={[styles.name, { flexShrink: 1 }]} numberOfLines={2}>
          {item.name || '—'}
        </Text>
        {(item.appOrderCount ?? 0) > 0 ? (
          <View
            style={[
              styles.appOrderBadge,
              { backgroundColor: theme.colors.primaryContainer },
            ]}>
            <Text
              style={[
                styles.appOrderBadgeText,
                { color: theme.colors.onPrimaryContainer },
              ]}>
              {item.appOrderCount}
            </Text>
          </View>
        ) : null}
      </View>
      <PhoneCallLink phone={item.phone} />
      {item.township ? (
        <Text
          style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
          numberOfLines={1}>
          {item.township}
        </Text>
      ) : null}
      {(item.appOrderCount ?? 0) > 0 &&
      (item.lastAppOrderNumber || item.lastAppOrderDate) ? (
        <Text
          style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
          numberOfLines={1}>
          App Order{' '}
          {item.lastAppOrderNumber || '—'}
          {item.lastAppOrderDate
            ? ` · ${
                formatMyanmarDateTime(item.lastAppOrderDate) ||
                item.lastAppOrderDate
              }`
            : ''}
        </Text>
      ) : null}
      {item.requestedAt ? (
        <Text
          style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
          numberOfLines={1}>
          Created {formatMyanmarDateTime(item.requestedAt) || item.requestedAt}
        </Text>
      ) : null}
      <StatusChip item={item} />
      <View style={styles.gridActions}>
        <UpdateMenu
          open={menuOpen}
          busy={busy}
          onOpen={onOpenMenu}
          onClose={onCloseMenu}
          onStatus={onStatus}
          onNotInstalled={onNotInstalled}
          onWaiting={onWaiting}
          onRemove={onRemove}
        />
        <Button
          compact
          mode="text"
          disabled={busy}
          onPress={onRemove}
          textColor={theme.colors.error}
          labelStyle={styles.updateBtnLabel}
          contentStyle={styles.updateBtnContent}>
          Remove
        </Button>
      </View>
    </View>
  );
}

export default function CallListScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const [items, setItems] = useState<AppInstallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<AppInstallStatus | 'all'>(
    'all',
  );
  const [dateFilters, setDateFilters] = useState<AppUserListDateFilters>({
    ...EMPTY_APP_USER_LIST_DATE_FILTERS,
  });
  const [otherReasonNote, setOtherReasonNote] = useState('');
  const [waitingNote, setWaitingNote] = useState('');
  const [page, setPage] = useState(1);
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<AppInstallRecord | null>(null);
  const [waitingFor, setWaitingFor] = useState<AppInstallRecord | null>(null);
  const [removeFor, setRemoveFor] = useState<AppInstallRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const listUiSnapshot = useMemo<CallListUi>(
    () => ({ viewMode, statusFilter, dateFilters }),
    [viewMode, statusFilter, dateFilters],
  );

  useListUiCache<CallListUi>('call-list', listUiSnapshot, saved => {
    if (saved.viewMode === 'list' || saved.viewMode === 'grid') {
      setViewMode(saved.viewMode);
    }
    if (
      saved.statusFilter === 'all' ||
      saved.statusFilter === 'new' ||
      saved.statusFilter === 'not_installed' ||
      saved.statusFilter === 'waiting' ||
      saved.statusFilter === 'not_pick_up' ||
      saved.statusFilter === 'please_come_and_install' ||
      saved.statusFilter === 'installed'
    ) {
      setStatusFilter(saved.statusFilter);
    }
    if (saved.dateFilters && typeof saved.dateFilters === 'object') {
      const period =
        saved.dateFilters.period === 'today' ||
        saved.dateFilters.period === 'week' ||
        saved.dateFilters.period === 'month'
          ? saved.dateFilters.period
          : '';
      setDateFilters({
        ...EMPTY_APP_USER_LIST_DATE_FILTERS,
        ...saved.dateFilters,
        period,
      });
    }
  });

  const query = useModuleSearch(
    ENABLE_APP_INSTALL_CALL_LIST
      ? 'Search App User List by name or phone'
      : '',
  );

  const filterPanel = useMemo(
    () => (
      <View style={styles.headerFilterPanel}>
        <Text style={styles.filterSectionLabel}>Status</Text>
        <View style={styles.headerFilterChips}>
          {APP_INSTALL_STATUS_OPTIONS.map(opt => (
            <Chip
              key={opt.id}
              compact
              selected={statusFilter === opt.id}
              onPress={() => setStatusFilter(opt.id)}
              style={styles.chip}>
              {opt.label}
            </Chip>
          ))}
        </View>

        <Text style={styles.filterSectionLabel}>Created date</Text>
        <View style={styles.headerFilterChips}>
          {APP_USER_LIST_DATE_PERIOD_OPTIONS.map(opt => {
            const selected =
              opt.id === 'all'
                ? !dateFilters.period &&
                  !dateFilters.startDate &&
                  !dateFilters.endDate
                : dateFilters.period === opt.id &&
                  !dateFilters.startDate &&
                  !dateFilters.endDate;
            return (
              <Chip
                key={opt.id}
                compact
                selected={selected}
                onPress={() => {
                  if (opt.id === 'all') {
                    setDateFilters({ ...EMPTY_APP_USER_LIST_DATE_FILTERS });
                    return;
                  }
                  setDateFilters({
                    period: opt.id,
                    startDate: '',
                    endDate: '',
                  });
                }}
                style={styles.chip}>
                {opt.label}
              </Chip>
            );
          })}
        </View>
        <View style={styles.headerFilterDates}>
          <View style={styles.dateField}>
            <CalendarField
              compact
              variant="header"
              value={dateFilters.startDate}
              onChange={startDate =>
                setDateFilters(prev => ({
                  ...prev,
                  startDate,
                  period: '',
                }))
              }
              placeholder="From"
            />
          </View>
          <View style={styles.dateField}>
            <CalendarField
              compact
              variant="header"
              value={dateFilters.endDate}
              onChange={endDate =>
                setDateFilters(prev => ({
                  ...prev,
                  endDate,
                  period: '',
                }))
              }
              placeholder="To"
            />
          </View>
        </View>
      </View>
    ),
    [statusFilter, dateFilters],
  );

  useModuleFilters(filterPanel, ENABLE_APP_INSTALL_CALL_LIST);

  const toggleView = useCallback(() => {
    setViewMode(prev => (prev === 'list' ? 'grid' : 'list'));
  }, []);

  const load = useCallback(async () => {
    if (!ENABLE_APP_INSTALL_CALL_LIST || !session?.token) return;
    setError('');
    try {
      const data = await fetchCallList(session.token, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        q: query.trim() || undefined,
      });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load App User List.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.token, statusFilter, query]);

  useEffect(() => {
    if (!ENABLE_APP_INSTALL_CALL_LIST) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      void load();
    }, 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, viewMode, dateFilters]);

  const visibleItems = useMemo(
    () =>
      items.filter(item =>
        matchesAppUserListDateFilters(item.requestedAt, dateFilters),
      ),
    [items, dateFilters],
  );

  const exportExcel = useCallback(() => {
    if (visibleItems.length === 0) {
      setError('Nothing to export. Adjust filters or add App User List contacts.');
      return;
    }
    setError('');
    const ok = exportCallListExcel(visibleItems);
    if (!ok) {
      setError('Excel export is only available on web.');
    }
  }, [visibleItems]);

  const headerActions = useMemo<HeaderAction[]>(
    () =>
      ENABLE_APP_INSTALL_CALL_LIST
        ? [
            {
              key: 'view',
              icon:
                viewMode === 'list' ? 'view-grid-outline' : 'format-list-bulleted',
              onPress: toggleView,
              accessibilityLabel: 'Toggle list or grid view',
            },
            {
              key: 'excel',
              icon: 'microsoft-excel',
              onPress: exportExcel,
              accessibilityLabel: 'Export App User List to Excel',
            },
          ]
        : [],
    [viewMode, toggleView, exportExcel],
  );
  useHeaderActions(headerActions);

  const pageCount = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return visibleItems.slice(start, start + PAGE_SIZE);
  }, [visibleItems, safePage]);

  const numColumns = useMemo(() => {
    if (viewMode !== 'grid') return 1;
    if (width >= 1200) return 3;
    if (width >= 768) return 2;
    return 1;
  }, [viewMode, width]);

  const cardWidth = useMemo(() => {
    const horizontalPadding = 32;
    const gap = 12;
    const available = width - horizontalPadding - gap * (numColumns - 1);
    return available / numColumns;
  }, [width, numColumns]);

  const setStatus = useCallback(
    async (
      item: AppInstallRecord,
      status: AppInstallStatus,
      reason?: AppInstallReason,
      reasonNote?: string,
    ) => {
      if (!session?.token) return;
      setBusyId(item.odooPartnerId);
      try {
        const updated = await updateAppInstallStatus(
          session.token,
          item.odooPartnerId,
          { status, reason, reasonNote },
        );
        setItems(prev =>
          prev.map(row =>
            row.odooPartnerId === item.odooPartnerId ? { ...row, ...updated } : row,
          ),
        );
        setReasonFor(null);
        setWaitingFor(null);
        setOtherReasonNote('');
        setWaitingNote('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status.');
      } finally {
        setBusyId(null);
        setMenuForId(null);
      }
    },
    [session?.token],
  );

  const removeItem = useCallback(
    async (item: AppInstallRecord) => {
      if (!session?.token) return;
      const id = item.odooPartnerId;
      setMenuForId(null);
      setBusyId(id);
      setError('');
      // Optimistic: drop from UI immediately so the click feels instant.
      setItems(prev => prev.filter(row => row.odooPartnerId !== id));
      try {
        await removeFromCallList(session.token, id);
      } catch (err) {
        setItems(prev =>
          prev.some(row => row.odooPartnerId === id) ? prev : [item, ...prev],
        );
        setError(
          err instanceof Error ? err.message : 'Failed to remove from App User List.',
        );
      } finally {
        setBusyId(null);
      }
    },
    [session?.token],
  );

  const emptyLabel =
    query.trim() ||
    statusFilter !== 'all' ||
    hasAppUserListDateFilters(dateFilters)
      ? 'No matching App User List contacts.'
      : 'No install requests yet. Use Request on a Customer.';

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        void load();
      }}
    />
  );

  if (!ENABLE_APP_INSTALL_CALL_LIST) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium">App User List is turned off</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          Temporary feature flag EXPO_PUBLIC_ENABLE_APP_INSTALL_CALL_LIST is false.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading App User List...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {error ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
      ) : null}

      {viewMode === 'list' ? (
        paged.length === 0 ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.emptyWrap}
            refreshControl={refreshControl}>
            <Text style={styles.empty}>{emptyLabel}</Text>
          </ScrollView>
        ) : (
          <View style={styles.flex}>
            <View
              style={[
                styles.listHeader,
                { backgroundColor: theme.colors.primary },
              ]}>
              <Text style={[styles.listHeaderText, { flex: 2.2 }]}>Name</Text>
              <Text style={[styles.listHeaderText, { flex: 1.6 }]}>Status</Text>
              <Text style={[styles.listHeaderText, { width: 168 }]}>Action</Text>
            </View>
            <ScrollView
              style={styles.flex}
              showsVerticalScrollIndicator={false}
              refreshControl={refreshControl}>
              {paged.map((item, index) => (
                <CallListRow
                  key={item.odooPartnerId}
                  item={item}
                  index={index}
                  menuOpen={menuForId === item.odooPartnerId}
                  busy={busyId === item.odooPartnerId}
                  onOpenMenu={() => setMenuForId(item.odooPartnerId)}
                  onCloseMenu={() => setMenuForId(null)}
                  onStatus={status => {
                    void setStatus(item, status);
                  }}
                  onNotInstalled={() => setReasonFor(item)}
                  onWaiting={() => setWaitingFor(item)}
                  onRemove={() => setRemoveFor(item)}
                />
              ))}
            </ScrollView>
          </View>
        )
      ) : (
        <FlatList
          key={`grid-${numColumns}`}
          data={paged}
          numColumns={numColumns}
          keyExtractor={item => item.odooPartnerId}
          contentContainerStyle={styles.gridList}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          refreshControl={refreshControl}
          ListEmptyComponent={<Text style={styles.empty}>{emptyLabel}</Text>}
          renderItem={({ item }) => (
            <View style={{ width: numColumns > 1 ? cardWidth : '100%' }}>
              <CallListCard
                item={item}
                menuOpen={menuForId === item.odooPartnerId}
                busy={busyId === item.odooPartnerId}
                onOpenMenu={() => setMenuForId(item.odooPartnerId)}
                onCloseMenu={() => setMenuForId(null)}
                onStatus={status => {
                  void setStatus(item, status);
                }}
                onNotInstalled={() => setReasonFor(item)}
                onWaiting={() => setWaitingFor(item)}
                onRemove={() => setRemoveFor(item)}
              />
            </View>
          )}
        />
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={visibleItems.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        centerLabel={`${visibleItems.length} contacts`}
        itemLabel="contact"
      />

      <Portal>
        <Dialog
          visible={Boolean(reasonFor)}
          onDismiss={() => {
            setReasonFor(null);
            setOtherReasonNote('');
          }}>
          <Dialog.Title>Why not installed?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
              Choose a reason for {reasonFor?.name || 'this contact'}.
            </Text>
            {APP_INSTALL_REASON_OPTIONS.filter(opt => opt.id !== 'other').map(
              opt => (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    if (!reasonFor) return;
                    void setStatus(reasonFor, 'not_installed', opt.id);
                  }}
                  style={[
                    styles.reasonRow,
                    { borderBottomColor: theme.colors.outlineVariant },
                  ]}>
                  <Text style={{ fontWeight: '600' }}>{opt.label}</Text>
                </Pressable>
              ),
            )}
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Other — type the reason
              </Text>
              <TextInput
                mode="outlined"
                dense
                value={otherReasonNote}
                onChangeText={setOtherReasonNote}
                placeholder="Enter reason…"
              />
              <Button
                mode="contained"
                disabled={!otherReasonNote.trim() || !reasonFor}
                onPress={() => {
                  if (!reasonFor) return;
                  const note = otherReasonNote.trim();
                  if (!note) return;
                  void setStatus(reasonFor, 'not_installed', 'other', note);
                }}>
                Save Other reason
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setReasonFor(null);
                setOtherReasonNote('');
              }}>
              Cancel
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={Boolean(waitingFor)}
          onDismiss={() => {
            setWaitingFor(null);
            setWaitingNote('');
          }}>
          <Dialog.Title>Waiting note</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
              Type why {waitingFor?.name || 'this contact'} is waiting.
            </Text>
            <TextInput
              mode="outlined"
              dense
              value={waitingNote}
              onChangeText={setWaitingNote}
              placeholder="Enter waiting note…"
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setWaitingFor(null);
                setWaitingNote('');
              }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              disabled={!waitingNote.trim() || !waitingFor}
              onPress={() => {
                if (!waitingFor) return;
                const note = waitingNote.trim();
                if (!note) return;
                void setStatus(waitingFor, 'waiting', undefined, note);
              }}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={Boolean(removeFor)} onDismiss={() => setRemoveFor(null)}>
          <Dialog.Title>Remove from App User List?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Are you sure you want to remove{' '}
              {removeFor?.name || 'this contact'} from App User List? This cannot
              be undone from here.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRemoveFor(null)}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              onPress={() => {
                if (!removeFor) return;
                const target = removeFor;
                setRemoveFor(null);
                void removeItem(target);
              }}>
              Remove
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerFilterPanel: {
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  filterSectionLabel: {
    width: '100%',
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.7,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  headerFilterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  headerFilterDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  dateField: {
    minWidth: 130,
    maxWidth: 170,
  },
  chip: { marginRight: 0 },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.7,
  },
  error: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  listHeaderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    minHeight: 56,
  },
  listMain: {
    flex: 2.2,
    minWidth: 0,
    gap: 2,
  },
  listName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
    minWidth: 0,
  },
  nameWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  appOrderBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appOrderBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    minWidth: 0,
  },
  listStatus: {
    flex: 1.6,
    minWidth: 0,
  },
  listActions: {
    width: 168,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  gridList: {
    padding: 16,
    paddingBottom: 24,
  },
  gridRow: {
    gap: 12,
    marginBottom: 12,
  },
  gridCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 6,
    marginBottom: 12,
    minHeight: 148,
  },
  name: { fontSize: 16, fontWeight: '800' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reasonHint: {
    fontSize: 12,
    opacity: 0.75,
    flexShrink: 1,
  },
  gridActions: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    paddingTop: 8,
  },
  updateBtn: {
    borderRadius: 6,
  },
  updateBtnLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginVertical: 0,
  },
  updateBtnContent: {
    height: 30,
  },
  reasonRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
