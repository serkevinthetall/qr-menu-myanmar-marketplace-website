/**
 * @temp-feature app-install-call-list
 *
 * Standalone Call List module for phone-app install follow-ups.
 * Does NOT use App Order / online-orders unread, alerts, or Redis read state.
 */
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
  Button,
  Chip,
  Dialog,
  Menu,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';

import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  APP_INSTALL_REASON_OPTIONS,
  APP_INSTALL_STATUS_OPTIONS,
  ENABLE_APP_INSTALL_CALL_LIST,
  exportCallListExcel,
  fetchCallList,
  removeFromCallList,
  updateAppInstallStatus,
  AppInstallReason,
  AppInstallRecord,
  AppInstallStatus,
} from '@/features/app-install';
import { useListUiCache } from '@/utils/list-ui-cache';

const PAGE_SIZE = 50;

type ViewMode = 'list' | 'grid';

type CallListUi = {
  viewMode: ViewMode;
  statusFilter: AppInstallStatus | 'all';
};

function statusColor(status: AppInstallStatus): { bg: string; fg: string } {
  switch (status) {
    case 'installed':
      return { bg: 'rgba(16, 185, 129, 0.18)', fg: '#047857' };
    case 'waiting':
      return { bg: 'rgba(59, 130, 246, 0.16)', fg: '#1D4ED8' };
    case 'new':
      return { bg: 'rgba(20, 184, 166, 0.18)', fg: '#0F766E' };
    case 'not_installed':
    default:
      return { bg: 'rgba(245, 158, 11, 0.2)', fg: '#B45309' };
  }
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
  onRemove,
}: {
  open: boolean;
  busy: boolean;
  onOpen: () => void;
  onClose: () => void;
  onStatus: (status: AppInstallStatus) => void;
  onNotInstalled: () => void;
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
        onPress={() => runAfterClose(() => onStatus('waiting'))}
        title="Waiting"
      />
      <Menu.Item
        onPress={() => runAfterClose(() => onStatus('installed'))}
        title="Installed"
      />
      <Menu.Item
        onPress={() => runAfterClose(onRemove)}
        title="Remove from list"
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
        <Text style={styles.listName} numberOfLines={1}>
          {item.name || '—'}
        </Text>
        <Text
          style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}
          numberOfLines={1}>
          {item.phone || 'No phone'}
          {item.township ? ` · ${item.township}` : ''}
        </Text>
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
  onRemove,
}: {
  item: AppInstallRecord;
  menuOpen: boolean;
  busy: boolean;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onStatus: (status: AppInstallStatus) => void;
  onNotInstalled: () => void;
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
      <Text style={styles.name} numberOfLines={2}>
        {item.name || '—'}
      </Text>
      <Text
        style={{ color: theme.colors.onSurfaceVariant }}
        numberOfLines={1}>
        {item.phone || 'No phone'}
      </Text>
      {item.township ? (
        <Text
          style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
          numberOfLines={1}>
          {item.township}
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
  const [page, setPage] = useState(1);
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<AppInstallRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const listUiSnapshot = useMemo<CallListUi>(
    () => ({ viewMode, statusFilter }),
    [viewMode, statusFilter],
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
      saved.statusFilter === 'installed'
    ) {
      setStatusFilter(saved.statusFilter);
    }
  });

  const query = useModuleSearch(
    ENABLE_APP_INSTALL_CALL_LIST ? 'Search call list by name or phone' : '',
  );

  const toggleView = useCallback(() => {
    setViewMode(prev => (prev === 'list' ? 'grid' : 'list'));
  }, []);

  const exportExcel = useCallback(() => {
    if (items.length === 0) {
      setError('Nothing to export. Adjust filters or add Call List contacts.');
      return;
    }
    setError('');
    const ok = exportCallListExcel(items);
    if (!ok) {
      setError('Excel export is only available on web.');
    }
  }, [items]);

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
              accessibilityLabel: 'Export call list to Excel',
            },
          ]
        : [],
    [viewMode, toggleView, exportExcel],
  );
  useHeaderActions(headerActions);

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
      setError(err instanceof Error ? err.message : 'Failed to load call list.');
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
  }, [query, statusFilter, viewMode]);

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, safePage]);

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
    ) => {
      if (!session?.token) return;
      setBusyId(item.odooPartnerId);
      try {
        const updated = await updateAppInstallStatus(
          session.token,
          item.odooPartnerId,
          { status, reason },
        );
        setItems(prev =>
          prev.map(row =>
            row.odooPartnerId === item.odooPartnerId ? { ...row, ...updated } : row,
          ),
        );
        setReasonFor(null);
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
          err instanceof Error ? err.message : 'Failed to remove from call list.',
        );
      } finally {
        setBusyId(null);
      }
    },
    [session?.token],
  );

  const emptyLabel =
    query.trim() || statusFilter !== 'all'
      ? 'No matching call-list contacts.'
      : 'No install call requests yet. Use Request on a Customer.';

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
        <Text variant="titleMedium">Call List is turned off</Text>
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
        <Text style={{ marginTop: 12 }}>Loading call list...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.filterRow}>
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
                  onRemove={() => {
                    void removeItem(item);
                  }}
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
                onRemove={() => {
                  void removeItem(item);
                }}
              />
            </View>
          )}
        />
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={items.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        centerLabel={`${items.length} contacts`}
        itemLabel="contact"
      />

      <Portal>
        <Dialog visible={Boolean(reasonFor)} onDismiss={() => setReasonFor(null)}>
          <Dialog.Title>Why not installed?</Dialog.Title>
          <Dialog.Content>
            <Text style={{ marginBottom: 12, color: theme.colors.onSurfaceVariant }}>
              Choose a reason for {reasonFor?.name || 'this contact'}.
            </Text>
            {APP_INSTALL_REASON_OPTIONS.map(opt => (
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
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setReasonFor(null)}>Cancel</Button>
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
