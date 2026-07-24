import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  HelperText,
  Searchbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { DismissibleModal } from '@/components/ui/DismissibleModal';
import { useAuth } from '@/contexts/auth-context';
import {
  AppContact,
  AppTownship,
  createAppContact,
  fetchAppTownships,
} from '@/services/app/contacts';

type AppNewCustomerFormProps = {
  initialName?: string;
  initialPhone?: string;
  onCancel: () => void;
  onCreated: (contact: AppContact) => void;
};

export function AppNewCustomerForm({
  initialName = '',
  initialPhone = '',
  onCancel,
  onCreated,
}: AppNewCustomerFormProps) {
  const theme = useTheme();
  const { session } = useAuth();

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [street, setStreet] = useState('');
  const [townshipId, setTownshipId] = useState('');
  const [townshipName, setTownshipName] = useState('');
  const [townships, setTownships] = useState<AppTownship[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.token) return;
    setLoadingMeta(true);
    fetchAppTownships(session.token)
      .then(setTownships)
      .catch(() => setError('Could not load townships.'))
      .finally(() => setLoadingMeta(false));
  }, [session?.token]);

  const filteredTownships = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const sorted = [...townships].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return sorted;
    return sorted.filter(t => t.name.toLowerCase().includes(q));
  }, [townships, pickerQuery]);

  const handleSave = async () => {
    if (!session?.token) return;
    setError('');
    if (!name.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Phone number is required.');
      return;
    }
    if (!townshipId) {
      setError('Township is required.');
      return;
    }

    setSaving(true);
    try {
      const created = await createAppContact(session.token, {
        name: name.trim(),
        phone: phone.trim(),
        townshipId,
        street: street.trim() || undefined,
      });
      onCreated({
        ...created,
        township: created.township || townshipName,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <Text variant="titleMedium" style={styles.title}>
          New customer
        </Text>

        {error ? (
          <HelperText type="error" visible>
            {error}
          </HelperText>
        ) : null}

        <TextInput
          mode="outlined"
          label="Name *"
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          mode="outlined"
          label="Phone *"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text style={styles.fieldLabel}>Township *</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={[
            styles.picker,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.surface,
            },
          ]}>
          <Text
            style={{
              color: townshipName
                ? theme.colors.onSurface
                : theme.colors.onSurfaceVariant,
            }}>
            {townshipName || 'Select township'}
          </Text>
        </Pressable>

        <TextInput
          mode="outlined"
          label="Street (optional)"
          value={street}
          onChangeText={setStreet}
          style={styles.input}
        />

        <View style={styles.actions}>
          <Button mode="outlined" onPress={onCancel} style={styles.actionBtn}>
            Cancel
          </Button>
          <Button
            mode="contained"
            loading={saving}
            disabled={saving || loadingMeta}
            onPress={() => void handleSave()}
            style={styles.actionBtn}>
            Create
          </Button>
        </View>
      </ScrollView>

      <DismissibleModal
        visible={pickerOpen}
        onDismiss={() => {
          setPickerOpen(false);
          setPickerQuery('');
        }}
        title="Select township"
        contentContainerStyle={styles.modal}>
        <Searchbar
          placeholder="Search township"
          value={pickerQuery}
          onChangeText={setPickerQuery}
          style={styles.modalSearch}
        />
        {loadingMeta ? (
          <ActivityIndicator style={{ marginVertical: 24 }} />
        ) : (
          <FlatList
            data={filteredTownships}
            keyExtractor={item => item.id}
            style={styles.modalList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setTownshipId(item.id);
                  setTownshipName(item.name);
                  setPickerOpen(false);
                  setPickerQuery('');
                }}
                style={[
                  styles.townshipRow,
                  {
                    borderBottomColor:
                      theme.colors.outlineVariant ?? theme.colors.outline,
                  },
                ]}>
                <Text>{item.name}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.modalEmpty}>No townships found.</Text>
            }
          />
        )}
      </DismissibleModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontWeight: '700', marginBottom: 8 },
  input: { marginBottom: 10 },
  fieldLabel: { fontWeight: '700', marginBottom: 6 },
  picker: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 16,
    marginBottom: 10,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { flex: 1 },
  modal: {
    maxHeight: '80%',
  },
  modalSearch: { marginBottom: 10 },
  modalList: { flexGrow: 0, maxHeight: 360 },
  townshipRow: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalEmpty: { textAlign: 'center', padding: 20, opacity: 0.6 },
});
