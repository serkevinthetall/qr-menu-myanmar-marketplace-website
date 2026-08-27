/**
 * App Promoter master list — names for the Mark Installed dropdown.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Dialog,
  IconButton,
  Portal,
  Snackbar,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { Pagination } from '@/components/ui/Pagination';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
} from '@/contexts/search-context';
import { ENABLE_APP_INSTALL_CALL_LIST } from '@/features/app-install';
import { mongoSaveErrorMessage } from '@/features/app-install/MongoSaveErrorDialog';
import {
  createAppPromoter,
  deleteAppPromoter,
  fetchAppPromoters,
  updateAppPromoter,
  type AppPromoter,
} from '@/features/app-promoters';
import { useResponsive } from '@/hooks/use-responsive';

const EMPTY_HEADER_ACTIONS: HeaderAction[] = [];
const PAGE_SIZE = 50;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export default function AppPromotersScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const enabled = ENABLE_APP_INSTALL_CALL_LIST;
  const { query } = useModuleSearch(
    'Search App Promoters by name',
    enabled,
  );

  const [rows, setRows] = useState<AppPromoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [snack, setSnack] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [editRow, setEditRow] = useState<AppPromoter | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteRow, setDeleteRow] = useState<AppPromoter | null>(null);

  const headerActions = useMemo<HeaderAction[]>(
    () => [
      {
        key: 'add-promoter',
        label: 'Add promoter',
        icon: 'plus',
        onPress: () => setAddOpen(true),
      },
    ],
    [],
  );
  useHeaderActions(enabled ? headerActions : EMPTY_HEADER_ACTIONS);

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

  const onCreate = useCallback(async () => {
    if (!session?.token) return;
    const name = addName.trim();
    if (!name) return;
    setBusyId('create');
    try {
      const created = await createAppPromoter(session.token, name);
      setRows(prev =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setAddOpen(false);
      setAddName('');
      setSnack(`Added "${created.name}".`);
    } catch (err) {
      setError(mongoSaveErrorMessage(err, 'Create'));
    } finally {
      setBusyId(null);
    }
  }, [session?.token, addName]);

  const onSaveEdit = useCallback(async () => {
    if (!session?.token || !editRow) return;
    const name = editName.trim();
    if (!name) return;
    setBusyId(editRow.id);
    try {
      const updated = await updateAppPromoter(session.token, editRow.id, { name });
      setRows(prev =>
        prev
          .map(row => (row.id === updated.id ? updated : row))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditRow(null);
      setEditName('');
      setSnack('App Promoter updated.');
    } catch (err) {
      setError(mongoSaveErrorMessage(err, 'Update'));
    } finally {
      setBusyId(null);
    }
  }, [session?.token, editRow, editName]);

  const onToggleActive = useCallback(
    async (row: AppPromoter, active: boolean) => {
      if (!session?.token) return;
      setBusyId(row.id);
      try {
        const updated = await updateAppPromoter(session.token, row.id, { active });
        setRows(prev =>
          prev.map(item => (item.id === updated.id ? updated : item)),
        );
        setSnack(
          active
            ? `"${row.name}" is active.`
            : `"${row.name}" is hidden from dropdown.`,
        );
      } catch (err) {
        setError(mongoSaveErrorMessage(err, 'Update'));
      } finally {
        setBusyId(null);
      }
    },
    [session?.token],
  );

  const onDelete = useCallback(async () => {
    if (!session?.token || !deleteRow) return;
    const id = deleteRow.id;
    setBusyId(id);
    try {
      await deleteAppPromoter(session.token, id);
      setRows(prev => prev.filter(row => row.id !== id));
      setDeleteRow(null);
      setSnack('App Promoter removed.');
    } catch (err) {
      setError(mongoSaveErrorMessage(err, 'Delete'));
    } finally {
      setBusyId(null);
    }
  }, [session?.token, deleteRow]);

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  if (!enabled) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium">App Promoter is turned off</Text>
        <Text
          style={{
            color: theme.colors.onSurfaceVariant,
            textAlign: 'center',
            marginTop: 8,
          }}>
          Enable the App User List feature to manage promoters.
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading App Promoters…</Text>
      </View>
    );
  }

  const emptyLabel = query.trim()
    ? 'No matching App Promoters.'
    : 'No App Promoters yet. Use Add promoter to create the first name.';

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

  const renderRow = (row: AppPromoter, index: number) => {
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
            {!isDesktop ? renderStatus(row.active) : null}
          </View>
        </View>

        {isDesktop ? (
          <View style={[styles.cell, styles.statusCol]}>{renderStatus(row.active)}</View>
        ) : null}

        <View style={[styles.cell, styles.activeCol]}>
          <Switch
            value={row.active}
            disabled={busyId === row.id}
            onValueChange={value => {
              void onToggleActive(row, value);
            }}
          />
        </View>

        <View style={[styles.cell, styles.actionsCol]}>
          <IconButton
            icon="pencil-outline"
            size={20}
            disabled={busyId === row.id}
            onPress={() => {
              setEditRow(row);
              setEditName(row.name);
            }}
            accessibilityLabel={`Edit ${row.name}`}
          />
          <IconButton
            icon="delete-outline"
            size={20}
            iconColor={theme.colors.error}
            disabled={busyId === row.id}
            onPress={() => setDeleteRow(row)}
            accessibilityLabel={`Delete ${row.name}`}
          />
        </View>
      </View>
    );
  };

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
            Promoter names
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            Shown when marking a contact as Installed. The chosen name is saved
            on the Odoo contact and the App User List record.
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
          {!query.trim() ? (
            <Button
              mode="contained"
              icon="plus"
              style={{ marginTop: 16 }}
              onPress={() => setAddOpen(true)}>
              Add promoter
            </Button>
          ) : null}
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
              <Text style={[styles.listHeaderText, styles.statusCol]}>Status</Text>
            ) : null}
            <Text style={[styles.listHeaderText, styles.activeCol]}>Show</Text>
            <Text style={[styles.listHeaderText, styles.actionsCol]}>Actions</Text>
          </View>
          <ScrollView style={styles.flex} refreshControl={refreshControl}>
            {paged.map((row, index) => renderRow(row, index))}
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

      <Portal>
        <Dialog
          visible={addOpen}
          onDismiss={() => {
            setAddOpen(false);
            setAddName('');
          }}>
          <Dialog.Title>Add App Promoter</Dialog.Title>
          <Dialog.Content>
            <Text
              style={{
                marginBottom: 12,
                color: theme.colors.onSurfaceVariant,
              }}>
              This name will appear in the Installed status dropdown.
            </Text>
            <TextInput
              mode="outlined"
              dense
              label="Name"
              value={addName}
              onChangeText={setAddName}
              autoFocus
              onSubmitEditing={() => {
                if (addName.trim()) void onCreate();
              }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setAddOpen(false);
                setAddName('');
              }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={busyId === 'create'}
              disabled={!addName.trim() || busyId === 'create'}
              onPress={() => {
                void onCreate();
              }}>
              Add
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={Boolean(editRow)} onDismiss={() => setEditRow(null)}>
          <Dialog.Title>Edit App Promoter</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              dense
              label="Name"
              value={editName}
              onChangeText={setEditName}
              autoFocus
              onSubmitEditing={() => {
                if (editName.trim()) void onSaveEdit();
              }}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditRow(null)}>Cancel</Button>
            <Button
              mode="contained"
              loading={Boolean(editRow && busyId === editRow.id)}
              disabled={
                !editName.trim() || Boolean(editRow && busyId === editRow.id)
              }
              onPress={() => {
                void onSaveEdit();
              }}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={Boolean(deleteRow)}
          onDismiss={() => setDeleteRow(null)}>
          <Dialog.Title>Delete App Promoter?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Remove {deleteRow?.name}? Existing App User List records keep their
              saved promoter name.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteRow(null)}>Cancel</Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              loading={Boolean(deleteRow && busyId === deleteRow.id)}
              disabled={Boolean(deleteRow && busyId === deleteRow.id)}
              onPress={() => {
                void onDelete();
              }}>
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={Boolean(snack)}
        onDismiss={() => setSnack('')}
        duration={3000}>
        {snack}
      </Snackbar>
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
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
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
  summaryCopy: {
    flex: 1,
    minWidth: 220,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
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
  nameCol: {
    flex: 2.4,
    minWidth: 0,
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nameMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameText: {
    fontWeight: '600',
    fontSize: 15,
  },
  statusCol: {
    width: 110,
  },
  activeCol: {
    width: 88,
    alignItems: 'flex-start',
  },
  actionsCol: {
    width: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
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
