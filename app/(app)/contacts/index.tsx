import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  IconButton,
  Searchbar,
  Text,
  useTheme,
} from 'react-native-paper';

import { useAuth } from '@/contexts/auth-context';
import { AppContact, fetchAppContacts } from '@/services/app/contacts';

export default function AppContactsScreen() {
  const theme = useTheme();
  const { session, logout } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [contacts, setContacts] = useState<AppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    if (!session?.token) return;
    setError('');
    try {
      const data = await fetchAppContacts(session.token, {
        q: debounced || undefined,
        limit: 100,
      });
      setContacts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.token, debounced]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topRow}>
        <Searchbar
          placeholder="Search name or phone"
          value={query}
          onChangeText={setQuery}
          style={styles.search}
        />
        <IconButton icon="logout" onPress={() => void logout()} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No contacts found.</Text>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
                },
              ]}>
              <Text variant="titleMedium" style={styles.name}>
                {item.name}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.phone || 'No phone'}
              </Text>
              {[item.township, item.city].filter(Boolean).length ? (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {[item.township, item.city].filter(Boolean).join(', ')}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 4,
  },
  search: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, paddingBottom: 32, gap: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  name: { fontWeight: '700', marginBottom: 2 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.6 },
});
