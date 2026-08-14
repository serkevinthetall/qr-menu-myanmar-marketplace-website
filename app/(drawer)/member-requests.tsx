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
  Portal,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';

import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { Pagination } from '@/components/ui/Pagination';
import { ThemeMode } from '@/constants/colors';
import { useAuth } from '@/contexts/auth-context';
import { useMemberRequestBadge } from '@/contexts/member-request-badge-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleFilters,
  useModuleSearch,
} from '@/contexts/search-context';
import { useAppTheme } from '@/contexts/theme-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchMemberRequests,
  updateMemberRequestStatus,
} from '@/services/member-requests';
import {
  getMemberRequestPeriodRange,
  MEMBER_REQUEST_DATE_PERIOD_OPTIONS,
  MEMBER_REQUEST_STATUSES,
  MemberRequest,
  MemberRequestDatePeriod,
  MemberRequestStatus,
} from '@/types/member-request';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';
import { toTelUri } from '@/utils/myanmar-phone';

const PAGE_SIZE = 50;
const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];

type Column = {
  key: string;
  label: string;
  flex: number;
};

const COLUMNS: Column[] = [
  { key: 'name', label: 'Name', flex: 1.6 },
  { key: 'customer', label: 'Customer', flex: 1.8 },
  { key: 'requestedPlan', label: 'Plan', flex: 1.1 },
  { key: 'phone', label: 'Phone', flex: 1.4 },
  { key: 'email', label: 'Email', flex: 1.6 },
  { key: 'status', label: 'Status', flex: 1.3 },
  { key: 'requestedAt', label: 'Requested at', flex: 1.5 },
  { key: 'notes', label: 'Notes', flex: 1.6 },
];

function getStatusColors(
  mode: ThemeMode,
  status: string,
): { bg: string; fg: string } {
  const value = status.trim().toLowerCase();
  if (mode === 'dark') {
    if (value === 'approved') {
      return { bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' };
    }
    if (value === 'rejected') {
      return { bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' };
    }
    if (value === 'requested') {
      return { bg: 'rgba(59, 130, 246, 0.25)', fg: '#93C5FD' };
    }
    return { bg: '#334155', fg: '#CBD5E1' };
  }
  if (value === 'approved') {
    return { bg: '#DCFCE7', fg: '#166534' };
  }
  if (value === 'rejected') {
    return { bg: '#FEE2E2', fg: '#991B1B' };
  }
  if (value === 'requested') {
    return { bg: '#DBEAFE', fg: '#1E40AF' };
  }
  return { bg: '#E2E8F0', fg: '#475569' };
}

function StatusBadge({ status }: { status: string }) {
  const { mode } = useAppTheme();
  const { bg, fg } = getStatusColors(mode, status);
  if (!status) {
    return <Text style={{ opacity: 0.5 }}>—</Text>;
  }
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

function StatusChangeButton({
  item,
  busy,
  onPress,
}: {
  item: MemberRequest;
  busy: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      disabled={busy}
      onPress={onPress}
      style={styles.statusMenuAnchor}
      accessibilityRole="button"
      accessibilityLabel={`Change status for ${item.name || item.id}`}>
      <StatusBadge status={item.status || 'Requested'} />
      <Text
        variant="labelSmall"
        style={[styles.statusHint, { color: theme.colors.primary }]}>
        {busy ? 'Updating…' : 'Change'}
      </Text>
    </Pressable>
  );
}

function RequestRow({
  item,
  index,
  busy,
  onOpenStatus,
}: {
  item: MemberRequest;
  index: number;
  busy: boolean;
  onOpenStatus: (item: MemberRequest) => void;
}) {
  const theme = useTheme();
  const zebra =
    index % 2 === 0 ? theme.colors.surface : theme.colors.surfaceVariant;
  const tel = toTelUri(item.phone);

  return (
    <View style={[styles.row, { backgroundColor: zebra }]}>
      {COLUMNS.map(col => {
        if (col.key === 'status') {
          return (
            <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
              <StatusChangeButton
                item={item}
                busy={busy}
                onPress={() => onOpenStatus(item)}
              />
            </View>
          );
        }
        if (col.key === 'customer') {
          return (
            <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
              <CustomerNameText>{item.customer || '—'}</CustomerNameText>
            </View>
          );
        }
        if (col.key === 'phone') {
          return (
            <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
              {tel ? (
                <Pressable onPress={() => void Linking.openURL(tel)}>
                  <Text
                    variant="bodySmall"
                    numberOfLines={1}
                    style={{ color: theme.colors.primary, fontWeight: '600' }}>
                    {item.phone}
                  </Text>
                </Pressable>
              ) : (
                <Text variant="bodySmall" numberOfLines={1}>
                  {item.phone || '—'}
                </Text>
              )}
            </View>
          );
        }
        if (col.key === 'requestedAt') {
          return (
            <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
              <Text variant="bodySmall" numberOfLines={2}>
                {formatMyanmarDateTime(item.requestedAt) ||
                  item.requestedAt ||
                  '—'}
              </Text>
            </View>
          );
        }
        const value =
          col.key === 'name'
            ? item.name
            : col.key === 'requestedPlan'
              ? item.requestedPlan
              : col.key === 'email'
                ? item.email
                : col.key === 'notes'
                  ? item.notes
                  : '';
        return (
          <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
            <Text variant="bodySmall" numberOfLines={2}>
              {value || '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function MemberRequestsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const query = useModuleSearch('Search name, phone, email, customer…');
  const { refreshRequestedCount } = useMemberRequestBadge();

  const [rows, setRows] = useState<MemberRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('Requested');
  const [datePeriod, setDatePeriod] = useState<MemberRequestDatePeriod>('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<MemberRequest | null>(null);
  const [snack, setSnack] = useState('');
  const [error, setError] = useState('');

  useHeaderActions(EMPTY_HEADER_ACTIONS);

  const dateRange = useMemo(
    () => getMemberRequestPeriodRange(datePeriod),
    [datePeriod],
  );

  const load = useCallback(
    async (opts?: { silent?: boolean; page?: number }) => {
      if (!session?.token) return;
      const nextPage = opts?.page ?? page;
      if (!opts?.silent) setLoading(true);
      setError('');
      try {
        const data = await fetchMemberRequests(session.token, {
          q: query || undefined,
          status: statusFilter || undefined,
          from: dateRange?.from,
          to: dateRange?.to,
          limit: PAGE_SIZE,
          offset: Math.max(0, nextPage - 1) * PAGE_SIZE,
        });
        setRows(data);
        setLoadedCount(data.length);
        setHasMore(data.length >= PAGE_SIZE);
        void refreshRequestedCount();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load member requests.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      session?.token,
      page,
      query,
      statusFilter,
      dateRange?.from,
      dateRange?.to,
      refreshRequestedCount,
    ],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, datePeriod]);

  const onSelectDatePeriod = useCallback((id: MemberRequestDatePeriod | 'all') => {
    setDatePeriod(id === 'all' ? '' : id);
  }, []);

  const dateChips = useMemo(
    () => (
      <View style={styles.filterRowWrap}>
        {MEMBER_REQUEST_DATE_PERIOD_OPTIONS.map(opt => (
          <Chip
            key={opt.id}
            compact
            selected={opt.id === 'all' ? !datePeriod : datePeriod === opt.id}
            onPress={() => onSelectDatePeriod(opt.id)}
            style={styles.chip}>
            {opt.label}
          </Chip>
        ))}
      </View>
    ),
    [datePeriod, onSelectDatePeriod],
  );

  const filterPanel = useMemo(
    () => (
      <View style={styles.headerFilterPanel}>
        <Text style={styles.filterSectionLabel}>Requested at</Text>
        {dateChips}
      </View>
    ),
    [dateChips],
  );

  useModuleFilters(filterPanel);

  const pageCount = Math.max(1, page + (hasMore ? 1 : 0));
  const totalEstimate =
    (page - 1) * PAGE_SIZE + loadedCount + (hasMore ? 1 : 0);

  const onRefresh = () => {
    setRefreshing(true);
    void load({ silent: true });
  };

  const onStatusChange = async (id: string, status: MemberRequestStatus) => {
    if (!session?.token) return;
    setUpdatingId(id);
    setStatusTarget(null);
    try {
      const updated = await updateMemberRequestStatus(session.token, id, status);
      setRows(prev =>
        prev
          .map(row => (row.id === id ? updated : row))
          .filter(row => !statusFilter || row.status === statusFilter),
      );
      setSnack(`Status updated to ${status}`);
      void refreshRequestedCount();
    } catch (err) {
      setSnack(
        err instanceof Error ? err.message : 'Failed to update status.',
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const header = useMemo(
    () => (
      <View style={styles.listHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          <Chip
            selected={!statusFilter}
            onPress={() => setStatusFilter('')}
            style={styles.chip}
            compact>
            All
          </Chip>
          {MEMBER_REQUEST_STATUSES.map(status => (
            <Chip
              key={status}
              selected={statusFilter === status}
              onPress={() => setStatusFilter(status)}
              style={styles.chip}
              compact>
              {status}
            </Chip>
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}>
          {MEMBER_REQUEST_DATE_PERIOD_OPTIONS.map(opt => (
            <Chip
              key={opt.id}
              compact
              selected={opt.id === 'all' ? !datePeriod : datePeriod === opt.id}
              onPress={() => onSelectDatePeriod(opt.id)}
              style={styles.chip}>
              {opt.label}
            </Chip>
          ))}
        </ScrollView>
        {isDesktop ? (
          <View
            style={[
              styles.row,
              styles.headRow,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}>
            {COLUMNS.map(col => (
              <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
                <Text variant="labelSmall" style={styles.headLabel}>
                  {col.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    ),
    [isDesktop, statusFilter, datePeriod, onSelectDatePeriod, theme.colors.surfaceVariant],
  );

  if (loading && rows.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      {error ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={item => item.id}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) =>
          isDesktop ? (
            <RequestRow
              item={item}
              index={index}
              busy={updatingId === item.id}
              onOpenStatus={setStatusTarget}
            />
          ) : (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}>
              <Text variant="titleSmall" style={{ fontWeight: '700' }}>
                {item.name || '—'}
              </Text>
              <Text variant="bodySmall">{item.customer || '—'}</Text>
              <Text variant="bodySmall">Plan: {item.requestedPlan || '—'}</Text>
              {item.phone ? (
                <Pressable
                  onPress={() => {
                    const tel = toTelUri(item.phone);
                    if (tel) void Linking.openURL(tel);
                  }}>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.primary, fontWeight: '600' }}>
                    {item.phone}
                  </Text>
                </Pressable>
              ) : null}
              <Text variant="bodySmall">{item.email || '—'}</Text>
              <Text variant="bodySmall">
                {formatMyanmarDateTime(item.requestedAt) ||
                  item.requestedAt ||
                  '—'}
              </Text>
              {item.notes ? (
                <Text variant="bodySmall" numberOfLines={3}>
                  {item.notes}
                </Text>
              ) : null}
              <StatusChangeButton
                item={item}
                busy={updatingId === item.id}
                onPress={() => setStatusTarget(item)}
              />
            </View>
          )
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No member requests found.</Text>
        }
      />
      <Pagination
        page={page}
        pageCount={pageCount}
        total={totalEstimate}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        itemLabel="request"
      />

      <Portal>
        <Dialog
          visible={Boolean(statusTarget)}
          onDismiss={() => setStatusTarget(null)}>
          <Dialog.Title>Change status</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 12 }}>
              {statusTarget?.name || statusTarget?.customer || 'Member request'}
            </Text>
            <View style={styles.statusOptions}>
              {MEMBER_REQUEST_STATUSES.map(status => {
                const selected = statusTarget?.status === status;
                return (
                  <Button
                    key={status}
                    mode={selected ? 'contained' : 'outlined'}
                    disabled={updatingId === statusTarget?.id}
                    onPress={() => {
                      if (!statusTarget) return;
                      void onStatusChange(statusTarget.id, status);
                    }}
                    style={styles.statusOptionBtn}>
                    {status}
                  </Button>
                );
              })}
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStatusTarget(null)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack('')} duration={3500}>
        {snack}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingBottom: 24 },
  listHeader: { gap: 8, paddingTop: 8 },
  filterRow: { gap: 8, paddingHorizontal: 12, paddingBottom: 4 },
  filterRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  headerFilterPanel: { gap: 8, paddingHorizontal: 4, paddingBottom: 8 },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.7,
    paddingHorizontal: 4,
  },
  chip: { marginRight: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  headRow: { borderBottomWidth: StyleSheet.hairlineWidth },
  headLabel: { fontWeight: '700', opacity: 0.7 },
  cell: { minWidth: 0 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusMenuAnchor: { gap: 2 },
  statusHint: { fontWeight: '600' },
  statusOptions: { gap: 8 },
  statusOptionBtn: { alignSelf: 'stretch' },
  card: {
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  empty: { textAlign: 'center', padding: 32, opacity: 0.6 },
  error: { paddingHorizontal: 12, paddingTop: 8 },
});
