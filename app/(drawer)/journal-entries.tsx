/**
 * Journal Entries — Odoo account.move (all move types).
 * Nested under Accounting in the drawer.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Chip, Icon, Text, useTheme } from 'react-native-paper';

import { JournalEntryDetailView } from '@/components/journal-entry/JournalEntryDetailView';
import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { ListSkeleton } from '@/components/ui/ListSkeleton';
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
  fetchJournalEntries,
  fetchJournalEntryDetail,
} from '@/services/journal-entries';
import {
  JournalEntry,
  JournalEntryDetail,
  JournalEntryStatusFilter,
} from '@/types/journal-entry';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

const PAGE_SIZE = 50;
const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];

const STATUS_FILTERS: { key: JournalEntryStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'posted', label: 'Posted' },
  { key: 'cancel', label: 'Cancelled' },
];

const COLUMNS = [
  { key: 'date', label: 'Date', flex: 1.1 },
  { key: 'number', label: 'Number', flex: 1.5 },
  { key: 'partner', label: 'Partner', flex: 1.7 },
  { key: 'reference', label: 'Reference', flex: 1.2 },
  { key: 'journal', label: 'Journal', flex: 1.4 },
  { key: 'amountTotal', label: 'Total', flex: 1.2, align: 'right' as const },
  { key: 'status', label: 'Status', flex: 1 },
];

function formatMoney(value: number, currency = 'MMK'): string {
  const safe = Number.isFinite(value) ? value : 0;
  const amount = safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount} ${currency || 'MMK'}`;
}

function getEntryStatusColors(
  mode: ThemeMode,
  statusLabel: string,
  state: string,
): { label: string; bg: string; fg: string } {
  const label = statusLabel.trim() || '—';
  const key = `${state} ${label}`.toLowerCase();

  if (mode === 'dark') {
    if (key.includes('posted')) {
      return { label, bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' };
    }
    if (key.includes('cancel')) {
      return { label, bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' };
    }
    if (key.includes('draft')) {
      return { label, bg: 'rgba(245, 158, 11, 0.22)', fg: '#FCD34D' };
    }
    return { label, bg: '#334155', fg: '#CBD5E1' };
  }

  if (key.includes('posted')) {
    return { label, bg: '#DCFCE7', fg: '#166534' };
  }
  if (key.includes('cancel')) {
    return { label, bg: '#FEE2E2', fg: '#991B1B' };
  }
  if (key.includes('draft')) {
    return { label, bg: '#FEF3C7', fg: '#92400E' };
  }
  return { label, bg: '#E2E8F0', fg: '#475569' };
}

function StatusBadge({
  statusLabel,
  state,
}: {
  statusLabel: string;
  state: string;
}) {
  const { mode } = useAppTheme();
  const { label, bg, fg } = getEntryStatusColors(mode, statusLabel, state);
  if (!statusLabel) {
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

export default function JournalEntriesScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const { mode } = useAppTheme();
  const { setDetailHeader } = useSearch();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useModuleSearch(
    'Search entries by number, partner, reference, or journal',
    !selectedId,
  );
  useHeaderActions(EMPTY_HEADER_ACTIONS);

  const [statusFilter, setStatusFilter] =
    useState<JournalEntryStatusFilter>('posted');
  const [rows, setRows] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const hasLoadedOnceRef = useRef(false);
  const [detail, setDetail] = useState<JournalEntryDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!session?.token) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const soft = Boolean(opts?.soft) || hasLoadedOnceRef.current;
      if (!soft) setLoading(true);
      if (!soft) setError('');
      try {
        const data = await fetchJournalEntries(session.token, {
          q: query.trim() || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          limit: 500,
          offset: 0,
        });
        setRows(data);
        setPage(1);
        hasLoadedOnceRef.current = true;
      } catch (err) {
        if (!soft) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load journal entries.',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.token, query, statusFilter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ soft: true });
  }, [load]);

  const closeDetail = useCallback(() => {
    setSelectedId(null);
    setDetail(null);
    setDetailError('');
  }, []);

  const openDetail = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  useEffect(() => {
    if (!selectedId || !session?.token) {
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError('');
    void fetchJournalEntryDetail(session.token, selectedId)
      .then(data => {
        if (!cancelled) setDetail(data);
      })
      .catch(err => {
        if (!cancelled) {
          setDetail(null);
          setDetailError(
            err instanceof Error
              ? err.message
              : 'Failed to load journal entry.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, session?.token]);

  useEffect(() => {
    if (!selectedId) {
      setDetailHeader(null);
      return;
    }
    setDetailHeader({
      title: detail?.number ?? 'Journal Entry',
      onBack: closeDetail,
      statusLabel: detail
        ? getEntryStatusColors(mode, detail.statusLabel, detail.state).label
        : undefined,
      breadcrumbParent: 'Journal Entries',
    });
    return () => setDetailHeader(null);
  }, [selectedId, detail, closeDetail, setDetailHeader, mode]);

  const visibleColumns = useMemo(() => {
    if (isDesktop) return COLUMNS;
    return COLUMNS.filter(col =>
      ['date', 'number', 'partner', 'amountTotal', 'status'].includes(col.key),
    );
  }, [isDesktop]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const totalAmount = useMemo(
    () => rows.reduce((sum, row) => sum + (Number(row.amountTotal) || 0), 0),
    [rows],
  );

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  if (selectedId) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}>
        <JournalEntryDetailView
          detail={detail}
          loading={detailLoading}
          error={detailError}
        />
      </View>
    );
  }

  if (loading && !hasLoadedOnceRef.current) {
    return <ListSkeleton variant="invoices" />;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.summaryBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor:
              theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <View style={styles.summaryCopy}>
          <Text variant="titleSmall" style={{ fontWeight: '700' }}>
            Journal Entries
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {rows.length} entr{rows.length === 1 ? 'y' : 'ies'} · from Odoo
          </Text>
        </View>
        <View
          style={[
            styles.statChip,
            { backgroundColor: theme.colors.primaryContainer },
          ]}>
          <Text
            style={{
              color: theme.colors.onPrimaryContainer,
              fontWeight: '700',
              fontSize: 13,
            }}>
            {formatMoney(totalAmount)}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.statusBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor:
              theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusScroll}
          contentContainerStyle={styles.statusRow}>
          {STATUS_FILTERS.map(item => {
            const selected = statusFilter === item.key;
            return (
              <Chip
                key={item.key}
                compact
                selected={selected}
                onPress={() => setStatusFilter(item.key)}
                style={[
                  styles.statusChip,
                  {
                    backgroundColor: selected
                      ? theme.colors.secondaryContainer
                      : theme.colors.surfaceVariant,
                  },
                ]}
                textStyle={{
                  color: selected
                    ? theme.colors.onSecondaryContainer
                    : theme.colors.onSurfaceVariant,
                  fontWeight: '600',
                  fontSize: 12,
                }}>
                {item.label}
              </Chip>
            );
          })}
        </ScrollView>
      </View>

      {error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      ) : paged.length === 0 ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.emptyWrap}
          refreshControl={refreshControl}>
          <Icon
            source="book-open-variant"
            size={40}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            variant="titleMedium"
            style={{
              color: theme.colors.onSurface,
              fontWeight: '700',
              marginTop: 8,
              textAlign: 'center',
            }}>
            {query.trim() || statusFilter !== 'all'
              ? 'No matching journal entries'
              : 'No journal entries'}
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.flex}>
          <View
            style={[
              styles.headerRow,
              { backgroundColor: theme.colors.primary },
            ]}>
            {visibleColumns.map(col => (
              <Text
                key={col.key}
                numberOfLines={1}
                style={[
                  styles.th,
                  { flex: col.flex, color: theme.colors.onPrimary },
                  col.align === 'right' ? styles.alignRight : null,
                ]}>
                {col.label}
              </Text>
            ))}
          </View>
          <ScrollView style={styles.flex} refreshControl={refreshControl}>
            {paged.map((row, index) => {
              const zebra = index % 2 === 1;
              return (
                <Pressable
                  key={row.id}
                  onPress={() => openDetail(row.id)}
                  style={({ hovered, pressed }) => [
                    styles.dataRow,
                    {
                      backgroundColor:
                        hovered || pressed
                          ? theme.colors.primaryContainer
                          : zebra
                            ? theme.colors.surfaceVariant
                            : theme.colors.surface,
                      borderBottomColor:
                        theme.colors.outlineVariant ?? theme.colors.outline,
                    },
                  ]}>
                  {visibleColumns.map(col => {
                    if (col.key === 'partner') {
                      return (
                        <View
                          key={col.key}
                          style={[styles.cell, { flex: col.flex }]}>
                          <CustomerNameText numberOfLines={1}>
                            {row.partner || '—'}
                          </CustomerNameText>
                        </View>
                      );
                    }
                    if (col.key === 'status') {
                      return (
                        <View
                          key={col.key}
                          style={[styles.cell, { flex: col.flex }]}>
                          <StatusBadge
                            statusLabel={row.statusLabel}
                            state={row.state}
                          />
                        </View>
                      );
                    }
                    let text = '—';
                    switch (col.key) {
                      case 'date':
                        text = formatMyanmarDate(row.date) || row.date || '—';
                        break;
                      case 'number':
                        text = row.number || '—';
                        break;
                      case 'reference':
                        text = row.reference || '—';
                        break;
                      case 'journal':
                        text = row.journal || '—';
                        break;
                      case 'amountTotal':
                        text = formatMoney(row.amountTotal, row.currency);
                        break;
                      default:
                        break;
                    }
                    return (
                      <Text
                        key={col.key}
                        numberOfLines={1}
                        style={[
                          styles.cellText,
                          { flex: col.flex, color: theme.colors.onSurface },
                          col.align === 'right' ? styles.alignRight : null,
                          col.key === 'number' ? styles.bold : null,
                        ]}>
                        {text}
                      </Text>
                    );
                  })}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={rows.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        centerLabel={`${rows.length} from Odoo`}
        itemLabel="entry"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  summaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  statChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusBar: {
    flexGrow: 0,
    flexShrink: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusScroll: {
    flexGrow: 0,
    maxHeight: 52,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexGrow: 0,
  },
  statusChip: {
    borderRadius: 16,
    height: 32,
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  th: {
    fontSize: 12,
    fontWeight: '700',
  },
  alignRight: {
    textAlign: 'right',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    justifyContent: 'center',
    minWidth: 0,
  },
  cellText: {
    fontSize: 13,
    minWidth: 0,
  },
  bold: {
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '100%',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
