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
  Text,
  useTheme,
} from 'react-native-paper';

import {
  AppSearchBar,
  AppSearchViewToggle,
} from '@/components/app/AppSearchBar';
import { useAuth } from '@/contexts/auth-context';
import {
  AppProductCatalog,
  ensureAppProductCatalog,
  filterAppProducts,
  subscribeAppProductCatalog,
} from '@/services/app/product-catalog-cache';

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
  const [category, setCategory] = useState('');
  const [catalog, setCatalog] = useState<AppProductCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    return subscribeAppProductCatalog(setCatalog);
  }, []);

  const bootstrap = useCallback(
    async (force = false) => {
      if (!session?.token) return;
      setError('');
      try {
        await ensureAppProductCatalog(session.token, { force });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.token],
  );

  useEffect(() => {
    setLoading(true);
    void bootstrap(false);
  }, [bootstrap]);

  const products = useMemo(
    () =>
      filterAppProducts(catalog?.products ?? [], {
        q: query,
        category,
      }),
    [catalog?.products, query, category],
  );

  const categoryChips = useMemo(
    () => ['', ...(catalog?.categories ?? [])],
    [catalog?.categories],
  );

  const syncing = Boolean(catalog && !catalog.complete);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.searchWrap}>
        <AppSearchBar
          placeholder="Search products or SKU"
          value={query}
          onChangeText={setQuery}
          right={
            <AppSearchViewToggle mode={viewMode} onChange={setViewMode} />
          }
        />
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsScroll}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled">
          {categoryChips.map(cat => (
            <Chip
              key={cat || 'all'}
              selected={category === cat}
              showSelectedCheck={false}
              compact
              onPress={() => setCategory(cat)}
              style={styles.chip}
              textStyle={styles.chipText}>
              {cat || 'All'}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {syncing ? (
        <Text
          style={[styles.syncHint, { color: theme.colors.onSurfaceVariant }]}>
          Loading full catalog…
        </Text>
      ) : null}

      {loading && !catalog?.products.length ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error && !catalog?.products.length ? (
        <View style={styles.center}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
        </View>
      ) : (
        <FlatList
          key={viewMode}
          data={products}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void bootstrap(true);
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
                viewMode === 'grid' ? styles.gridCard : styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor:
                    theme.colors.outlineVariant ?? theme.colors.outline,
                },
              ]}>
              <Text
                variant="titleMedium"
                style={styles.name}
                numberOfLines={viewMode === 'grid' ? 3 : 2}>
                {item.name}
              </Text>
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
                numberOfLines={1}>
                {item.sku || '—'}
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
  chipsWrap: {
    marginTop: 4,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chips: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    paddingRight: 20,
    alignItems: 'center',
    flexDirection: 'row',
  },
  chip: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 20,
    marginVertical: 6,
  },
  syncHint: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    fontSize: 12,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, paddingBottom: 32 },
  gridRow: { gap: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  gridCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    minHeight: 120,
  },
  name: { fontWeight: '700' },
  price: { marginTop: 8, fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.6 },
});
