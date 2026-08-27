/**
 * App Promoter master list — names shown in the Customer install Request dropdown.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
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

import { useAuth } from '@/contexts/auth-context';
import { HeaderAction, useHeaderActions } from '@/contexts/search-context';
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

export default function AppPromotersScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();
  const enabled = ENABLE_APP_INSTALL_CALL_LIST;

  const [rows, setRows] = useState<AppPromoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [snack, setSnack] = useState('');
  const [error, setError] = useState('');

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

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
        setRows(prev => prev.map(item => (item.id === updated.id ? updated : item)));
        setSnack(active ? `"${row.name}" is active.` : `"${row.name}" is hidden from dropdown.`);
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

  if (!enabled) {
    return (
      <View style={styles.center}>
        <Text>App Promoter module is disabled.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.intro, { borderBottomColor: theme.colors.outline }]}>
        <Text variant="bodyMedium" style={{ opacity: 0.75 }}>
          Names here appear in the Customer install Request dropdown. The selected
          name is saved on the contact in Odoo and on the App User List record.
        </Text>
      </View>

      {isDesktop ? (
        <ScrollView horizontal style={styles.tableScroll}>
          <View style={[styles.table, { minWidth: 640 }]}>
            <View
              style={[
                styles.row,
                styles.headerRow,
                { borderBottomColor: theme.colors.outline },
              ]}>
              <Text style={[styles.cell, styles.nameCol, styles.headerText]}>Name</Text>
              <Text style={[styles.cell, styles.activeCol, styles.headerText]}>
                Active
              </Text>
              <Text style={[styles.cell, styles.actionsCol, styles.headerText]}>
                Actions
              </Text>
            </View>
            {rows.length === 0 ? (
              <View style={styles.emptyRow}>
                <Text style={{ opacity: 0.7 }}>No App Promoters yet.</Text>
              </View>
            ) : (
              rows.map(row => (
                <View
                  key={row.id}
                  style={[styles.row, { borderBottomColor: theme.colors.outline }]}>
                  <Text style={[styles.cell, styles.nameCol]}>{row.name}</Text>
                  <View style={[styles.cell, styles.activeCol]}>
                    <Switch
                      value={row.active}
                      disabled={busyId === row.id}
                      onValueChange={value => {
                        void onToggleActive(row, value);
                      }}
                    />
                  </View>
                  <View style={[styles.cell, styles.actionsCol, styles.actions]}>
                    <IconButton
                      icon="pencil-outline"
                      size={20}
                      disabled={busyId === row.id}
                      onPress={() => {
                        setEditRow(row);
                        setEditName(row.name);
                      }}
                    />
                    <IconButton
                      icon="delete-outline"
                      size={20}
                      disabled={busyId === row.id}
                      onPress={() => setDeleteRow(row)}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyRow}>
              <Text style={{ opacity: 0.7 }}>No App Promoters yet.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.surface,
                },
              ]}>
              <View style={styles.cardTop}>
                <Text variant="titleMedium">{item.name}</Text>
                <Switch
                  value={item.active}
                  disabled={busyId === item.id}
                  onValueChange={value => {
                    void onToggleActive(item, value);
                  }}
                />
              </View>
              <View style={styles.cardActions}>
                <Button
                  compact
                  mode="outlined"
                  disabled={busyId === item.id}
                  onPress={() => {
                    setEditRow(item);
                    setEditName(item.name);
                  }}>
                  Edit
                </Button>
                <Button
                  compact
                  mode="outlined"
                  textColor={theme.colors.error}
                  disabled={busyId === item.id}
                  onPress={() => setDeleteRow(item)}>
                  Delete
                </Button>
              </View>
            </View>
          )}
        />
      )}

      <Portal>
        <Dialog visible={addOpen} onDismiss={() => setAddOpen(false)}>
          <Dialog.Title>Add App Promoter</Dialog.Title>
          <Dialog.Content>
            <TextInput
              mode="outlined"
              dense
              label="Name"
              value={addName}
              onChangeText={setAddName}
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddOpen(false)}>Cancel</Button>
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
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setEditRow(null)}>Cancel</Button>
            <Button
              mode="contained"
              loading={Boolean(editRow && busyId === editRow.id)}
              disabled={!editName.trim() || Boolean(editRow && busyId === editRow.id)}
              onPress={() => {
                void onSaveEdit();
              }}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={Boolean(deleteRow)} onDismiss={() => setDeleteRow(null)}>
          <Dialog.Title>Delete App Promoter?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Remove {deleteRow?.name}? Existing App User List records keep their saved
              promoter name.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteRow(null)}>Cancel</Button>
            <Button
              mode="contained"
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

      <Snackbar visible={Boolean(snack)} onDismiss={() => setSnack('')} duration={3000}>
        {snack}
      </Snackbar>
      <Snackbar visible={Boolean(error)} onDismiss={() => setError('')} duration={5000}>
        {error}
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
  intro: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tableScroll: {
    flex: 1,
  },
  table: {
    flex: 1,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  headerRow: {
    minHeight: 44,
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  headerText: {
    fontWeight: '700',
    opacity: 0.8,
  },
  nameCol: {
    flex: 2,
  },
  activeCol: {
    width: 100,
    alignItems: 'flex-start',
  },
  actionsCol: {
    width: 120,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyRow: {
    padding: 24,
    alignItems: 'center',
  },
  card: {
    marginHorizontal: 12,
    marginTop: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    gap: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
});
