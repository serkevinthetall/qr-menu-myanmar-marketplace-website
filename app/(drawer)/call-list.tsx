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
  useHeaderActions,
  useModuleSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  APP_INSTALL_REASON_OPTIONS,
  APP_INSTALL_STATUS_OPTIONS,
  ENABLE_APP_INSTALL_CALL_LIST,
  fetchCallList,
  updateAppInstallStatus,
  AppInstallReason,
  AppInstallRecord,
  AppInstallStatus,
} from '@/features/app-install';

const PAGE_SIZE = 50;

function statusColor(status: AppInstallStatus): { bg: string; fg: string } {
  switch (status) {
    case 'installed':
      return { bg: 'rgba(16, 185, 129, 0.18)', fg: '#047857' };
    case 'not_installed':
      return { bg: 'rgba(245, 158, 11, 0.2)', fg: '#B45309' };
    default:
      return { bg: 'rgba(59, 130, 246, 0.16)', fg: '#1D4ED8' };
  }
}

export default function CallListScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const [items, setItems] = useState<AppInstallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<AppInstallStatus | 'all'>(
    'all',
  );
  const [page, setPage] = useState(1);
  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<AppInstallRecord | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useModuleSearch(
    ENABLE_APP_INSTALL_CALL_LIST ? 'Search call list by name or phone' : '',
  );
  useHeaderActions([]);

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
  }, [query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, safePage]);

  const setStatus = useCallback(
    async (item: AppInstallRecord, status: AppInstallStatus, reason?: AppInstallReason) => {
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

      <FlatList
        data={paged}
        keyExtractor={item => item.odooPartnerId}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query.trim() || statusFilter !== 'all'
              ? 'No matching call-list contacts.'
              : 'No install call requests yet. Use Request on a Customer.'}
          </Text>
        }
        renderItem={({ item }) => {
          const colors = statusColor(item.status);
          return (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                  maxWidth: width > 900 ? 720 : undefined,
                },
              ]}>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name || '—'}
                </Text>
                <Text
                  style={{ color: theme.colors.onSurfaceVariant }}
                  numberOfLines={1}>
                  {item.phone || 'No phone'}
                  {item.township ? ` · ${item.township}` : ''}
                </Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                    <Text style={{ color: colors.fg, fontWeight: '700', fontSize: 12 }}>
                      {item.statusLabel}
                    </Text>
                  </View>
                  {item.reasonLabel ? (
                    <Text
                      style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
                      numberOfLines={1}>
                      {item.reasonLabel}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Menu
                visible={menuForId === item.odooPartnerId}
                onDismiss={() => setMenuForId(null)}
                anchor={
                  <Button
                    compact
                    mode="contained-tonal"
                    loading={busyId === item.odooPartnerId}
                    disabled={busyId === item.odooPartnerId}
                    onPress={() => setMenuForId(item.odooPartnerId)}>
                    Update
                  </Button>
                }>
                <Menu.Item
                  onPress={() => void setStatus(item, 'not_called')}
                  title="Not called"
                />
                <Menu.Item
                  onPress={() => {
                    setMenuForId(null);
                    setReasonFor(item);
                  }}
                  title="Not installed…"
                />
                <Menu.Item
                  onPress={() => void setStatus(item, 'installed')}
                  title="Installed"
                />
              </Menu>
            </View>
          );
        }}
      />

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
  list: {
    padding: 16,
    paddingBottom: 24,
    gap: 10,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: '800' },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
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
  reasonRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
