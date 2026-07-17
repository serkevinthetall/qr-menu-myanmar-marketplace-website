import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  FAB,
  Searchbar,
  Text,
  useTheme,
} from 'react-native-paper';

import { getQuotationStatusColors } from '@/constants/status-colors';
import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/contexts/theme-context';
import { fetchAppQuotations } from '@/services/app/quotations';
import { Quotation } from '@/types/quotation';

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function AppQuotationsScreen() {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const { session } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [items, setItems] = useState<Quotation[]>([]);
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
      const data = await fetchAppQuotations(session.token, {
        q: debounced || undefined,
      });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotations.');
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
      <View style={styles.searchWrap}>
        <Searchbar
          placeholder="Search number or customer"
          value={query}
          onChangeText={setQuery}
        />
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
          data={items}
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
            <Text style={styles.empty}>No quotations found.</Text>
          }
          renderItem={({ item }) => {
            const status = getQuotationStatusColors(mode, item.status);
            return (
              <Pressable
                onPress={() => router.push(`/(app)/quotations/${item.id}`)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor:
                      theme.colors.outlineVariant ?? theme.colors.outline,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}>
                <View style={styles.row}>
                  <Text variant="titleMedium" style={styles.number}>
                    {item.number}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: status.bg }]}>
                    <Text style={{ color: status.fg, fontSize: 11, fontWeight: '700' }}>
                      {status.label}
                    </Text>
                  </View>
                </View>
                <Text
                  variant="bodyMedium"
                  numberOfLines={1}
                  style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.customer || '—'}
                </Text>
                <Text variant="titleSmall" style={styles.total}>
                  {formatMoney(item.total)} MMK
                </Text>
              </Pressable>
            );
          }}
        />
      )}

      <FAB
        icon="plus"
        label="New"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={() => router.push('/(app)/quotations/new')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { paddingHorizontal: 12, paddingTop: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, paddingBottom: 96 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  number: { fontWeight: '800', flex: 1 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  total: { marginTop: 8, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.6 },
  fab: { position: 'absolute', right: 16, bottom: 20 },
});
