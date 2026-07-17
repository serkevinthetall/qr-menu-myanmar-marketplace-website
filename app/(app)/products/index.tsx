import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Chip,
  Searchbar,
  Text,
  useTheme,
} from 'react-native-paper';

import { useAuth } from '@/contexts/auth-context';
import { AppProduct, fetchAppProducts } from '@/services/app/products';

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function AppProductsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [products, setProducts] = useState<AppProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
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
      const result = await fetchAppProducts(session.token, {
        q: debounced || undefined,
        category: category || undefined,
        limit: 100,
      });
      setProducts(result.products);
      if (!category && !debounced) {
        setCategories(result.categories);
      } else if (result.categories.length > 0) {
        setCategories(prev => (prev.length ? prev : result.categories));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.token, debounced, category]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const categoryChips = useMemo(
    () => ['', ...categories],
    [categories],
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.searchWrap}>
        <Searchbar
          placeholder="Search products or SKU"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        {categoryChips.map(cat => (
          <Chip
            key={cat || 'all'}
            selected={category === cat}
            showSelectedCheck={false}
            onPress={() => setCategory(cat)}
            style={styles.chip}>
            {cat || 'All'}
          </Chip>
        ))}
      </ScrollView>

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
          data={products}
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
            <Text style={styles.empty}>No products found.</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    theme.colors.outlineVariant ?? theme.colors.outline,
                },
              ]}>
              <Text variant="titleMedium" style={styles.name}>
                {item.name}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}>
                {item.sku || '—'} · {item.category || 'Uncategorized'}
              </Text>
              <Text variant="titleSmall" style={styles.price}>
                {formatMoney(item.price)} MMK
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  searchWrap: { paddingHorizontal: 12, paddingTop: 8 },
  chips: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip: { marginRight: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, paddingBottom: 32 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  name: { fontWeight: '700' },
  price: { marginTop: 8, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.6 },
});
