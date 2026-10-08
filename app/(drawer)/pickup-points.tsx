/**
 * Pickup Points — Odoo x_pickup_point (create / edit).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Dialog,
  Icon,
  IconButton,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { ListSkeleton } from '@/components/ui/ListSkeleton';
import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  createPickupPoint,
  fetchPickupPoints,
  updatePickupPoint,
} from '@/services/pickup-points';
import { PickupPoint } from '@/types/pickup-point';

const PAGE_SIZE = 50;

const COLUMNS = [
  { key: 'name', label: 'Name', flex: 1.4 },
  { key: 'township', label: 'Township', flex: 1.2 },
  { key: 'address', label: 'Address', flex: 2 },
  { key: 'actions', label: '', flex: 0.7 },
];

export default function PickupPointsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const query = useModuleSearch('Search pickup points by name, township, or address');

  const [rows, setRows] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PickupPoint | null>(null);
  const [name, setName] = useState('');
  const [township, setTownship] = useState('');
  const [address, setAddress] = useState('');
  const [formError, setFormError] = useState('');

  const openCreate = useCallback(() => {
    setEditing(null);
    setName('');
    setTownship('');
    setAddress('');
    setFormError('');
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((row: PickupPoint) => {
    setEditing(row);
    setName(row.name);
    setTownship(row.township);
    setAddress(row.address);
    setFormError('');
    setFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    if (busy) return;
    setFormOpen(false);
    setEditing(null);
    setFormError('');
  }, [busy]);

  const headerActions = useMemo<HeaderAction[]>(
    () => [
      {
        key: 'add-pickup',
        label: 'New',
        icon: 'plus',
        onPress: openCreate,
      },
    ],
    [openCreate],
  );
  useHeaderActions(headerActions);

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
        const data = await fetchPickupPoints(session.token, {
          q: query.trim() || undefined,
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
              : 'Failed to load pickup points.',
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.token, query],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load({ soft: true });
  }, [load]);

  const onSave = useCallback(async () => {
    if (!session?.token) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Name is required.');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      const payload = {
        name: trimmedName,
        township: township.trim(),
        address: address.trim(),
      };
      if (editing) {
        const updated = await updatePickupPoint(
          session.token,
          editing.id,
          payload,
        );
        setRows(prev =>
          prev
            .map(row => (row.id === updated.id ? updated : row))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSnack(`Updated "${updated.name}".`);
      } else {
        const created = await createPickupPoint(session.token, payload);
        setRows(prev =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSnack(`Created "${created.name}".`);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Failed to save pickup point.',
      );
    } finally {
      setBusy(false);
    }
  }, [session?.token, name, township, address, editing]);

  const visibleColumns = useMemo(() => {
    if (isDesktop) return COLUMNS;
    return COLUMNS.filter(col =>
      ['name', 'township', 'actions'].includes(col.key),
    );
  }, [isDesktop]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

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
            Pickup Point
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {rows.length} point{rows.length === 1 ? '' : 's'} · from Odoo
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
            {rows.length} total
          </Text>
        </View>
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
            source="map-marker-radius-outline"
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
            {query.trim() ? 'No matching pickup points' : 'No pickup points yet'}
          </Text>
          {!query.trim() ? (
            <Button mode="contained" style={{ marginTop: 16 }} onPress={openCreate}>
              New pickup point
            </Button>
          ) : null}
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
                  onPress={() => openEdit(row)}
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
                    if (col.key === 'actions') {
                      return (
                        <View
                          key={col.key}
                          style={[styles.cell, { flex: col.flex }]}>
                          <IconButton
                            icon="pencil-outline"
                            size={18}
                            onPress={() => openEdit(row)}
                            accessibilityLabel={`Edit ${row.name}`}
                          />
                        </View>
                      );
                    }
                    let text = '—';
                    switch (col.key) {
                      case 'name':
                        text = row.name || '—';
                        break;
                      case 'township':
                        text = row.township || '—';
                        break;
                      case 'address':
                        text = row.address || '—';
                        break;
                      default:
                        break;
                    }
                    return (
                      <Text
                        key={col.key}
                        numberOfLines={col.key === 'address' ? 2 : 1}
                        style={[
                          styles.cellText,
                          { flex: col.flex, color: theme.colors.onSurface },
                          col.key === 'name' ? styles.bold : null,
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
        itemLabel="point"
      />

      <Portal>
        <Dialog visible={formOpen} onDismiss={closeForm}>
          <Dialog.Title>
            {editing ? 'Edit pickup point' : 'New pickup point'}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              label="Name"
              value={name}
              onChangeText={setName}
              style={styles.field}
              disabled={busy}
            />
            <TextInput
              mode="outlined"
              label="Township"
              value={township}
              onChangeText={setTownship}
              style={styles.field}
              disabled={busy}
            />
            <TextInput
              mode="outlined"
              label="Address"
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              style={styles.field}
              disabled={busy}
            />
            {formError ? (
              <Text style={{ color: theme.colors.error, marginTop: 4 }}>
                {formError}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={busy} onPress={closeForm}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={busy}
              disabled={busy}
              onPress={() => {
                void onSave();
              }}>
              {editing ? 'Save' : 'Create'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={Boolean(snack)}
        onDismiss={() => setSnack('')}
        duration={2500}>
        {snack}
      </Snackbar>
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
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: 0,
  },
  cellText: {
    fontSize: 13,
    minWidth: 0,
  },
  bold: {
    fontWeight: '600',
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
  field: {
    marginBottom: 10,
  },
});
