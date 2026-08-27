/**
 * App Promoter list from Odoo (read-only).
 * Manage names and amounts in Odoo: Contacts → App Promoter.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';

import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/contexts/auth-context';
import { useHeaderActions, useModuleSearch, type HeaderAction } from '@/contexts/search-context';
import { ENABLE_APP_INSTALL_CALL_LIST } from '@/features/app-install';
import { mongoSaveErrorMessage } from '@/features/app-install/MongoSaveErrorDialog';
import { fetchAppPromoters, type AppPromoter } from '@/features/app-promoters';
import { useResponsive } from '@/hooks/use-responsive';

const PAGE_SIZE = 50;
const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function formatAmount(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function AppPromotersScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const enabled = ENABLE_APP_INSTALL_CALL_LIST;
  const { query } = useModuleSearch('Search App Promoters by name', enabled);

  const [rows, setRows] = useState<AppPromoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useHeaderActions(EMPTY_HEADER_ACTIONS);

  const load = useCallback(async () => {
    if (!enabled || !session?.token) {
      setRows([]);
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAppPromoters(session.token);
      setRows(data);
      setError('');
    } catch (err) {
      setRows([]);
      setError(mongoSaveErrorMessage(err, 'Loading App Promoters'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled, session?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => row.name.toLowerCase().includes(q));
  }, [rows, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const activeCount = useMemo(
    () => rows.filter(row => row.active).length,
    [rows],
  );

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  if (!enabled) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium">App Promoter is turned off</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading from Odoo…</Text>
      </View>
    );
  }

  const emptyLabel = query.trim()
    ? 'No matching App Promoters.'
    : 'No App Promoters in Odoo yet. Add them under Contacts → App Promoter.';

  const renderStatus = (active: boolean) => (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: active
            ? 'rgba(16, 185, 129, 0.16)'
            : theme.colors.surfaceVariant,
        },
      ]}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '700',
          color: active ? '#047857' : theme.colors.onSurfaceVariant,
        }}>
        {active ? 'Active' : 'Hidden'}
      </Text>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.summaryBar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.outline,
          },
        ]}>
        <View style={styles.summaryCopy}>
          <Text variant="titleSmall" style={{ fontWeight: '700' }}>
            From Odoo
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            Names and amounts come from Odoo (Contacts → App Promoter). Active
            names appear when marking Installed on the website.
          </Text>
        </View>
        <View style={styles.summaryStats}>
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
              {rows.length} total
            </Text>
          </View>
          <View
            style={[
              styles.statChip,
              { backgroundColor: 'rgba(16, 185, 129, 0.16)' },
            ]}>
            <Text style={{ color: '#047857', fontWeight: '700', fontSize: 13 }}>
              {activeCount} active
            </Text>
          </View>
        </View>
      </View>

      {paged.length === 0 ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.emptyWrap}
          refreshControl={refreshControl}>
          <Text
            variant="titleMedium"
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {emptyLabel}
          </Text>
        </ScrollView>
      ) : (
        <View style={styles.flex}>
          <View
            style={[
              styles.listHeader,
              { backgroundColor: theme.colors.primary },
            ]}>
            <Text style={[styles.listHeaderText, styles.nameCol]}>Name</Text>
            {isDesktop ? (
              <Text style={[styles.listHeaderText, styles.amountCol]}>
                Amount / customer
              </Text>
            ) : null}
            <Text style={[styles.listHeaderText, styles.statusCol]}>Status</Text>
          </View>
          <ScrollView style={styles.flex} refreshControl={refreshControl}>
            {paged.map((row, index) => {
              const zebra = index % 2 === 1;
              return (
                <View
                  key={row.id}
                  style={[
                    styles.listRow,
                    {
                      backgroundColor: zebra
                        ? theme.colors.surfaceVariant
                        : theme.colors.surface,
                      borderBottomColor:
                        theme.colors.outlineVariant ?? theme.colors.outline,
                    },
                  ]}>
                  <View style={[styles.cell, styles.nameCol, styles.nameCell]}>
                    <Avatar.Text
                      size={36}
                      label={initials(row.name)}
                      style={{ backgroundColor: theme.colors.primaryContainer }}
                      labelStyle={{
                        color: theme.colors.onPrimaryContainer,
                        fontSize: 13,
                        fontWeight: '700',
                      }}
                    />
                    <View style={styles.nameMeta}>
                      <Text style={styles.nameText} numberOfLines={1}>
                        {row.name}
                      </Text>
                      {!isDesktop ? (
                        <Text
                          style={{
                            color: theme.colors.onSurfaceVariant,
                            fontSize: 12,
                          }}>
                          {formatAmount(row.amountPerCustomer ?? 0)} / customer
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {isDesktop ? (
                    <View style={[styles.cell, styles.amountCol]}>
                      <Text style={{ fontWeight: '600' }}>
                        {formatAmount(row.amountPerCustomer ?? 0)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={[styles.cell, styles.statusCol]}>
                    {renderStatus(row.active)}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        centerLabel={`${activeCount} active of ${rows.length}`}
        itemLabel="promoter"
      />

      <Snackbar
        visible={Boolean(error)}
        onDismiss={() => setError('')}
        duration={5000}>
        {error}
      </Snackbar>
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
  summaryBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  summaryCopy: { flex: 1, minWidth: 220 },
  summaryStats: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  statChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  listHeaderText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  nameCol: { flex: 2.2, minWidth: 0 },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  nameMeta: { flex: 1, minWidth: 0, gap: 2 },
  nameText: { fontWeight: '600', fontSize: 15 },
  amountCol: { width: 140 },
  statusCol: { width: 100 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  emptyWrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
