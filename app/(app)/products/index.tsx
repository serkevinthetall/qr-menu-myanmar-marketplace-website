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
  AppFloatingSearchHeader,
  AppSearchBar,
  AppSearchViewToggle,
  APP_FLOATING_SEARCH_WITH_CHIPS_INSET,
} from '@/components/app/AppSearchBar';
import { CustomerNameText } from '@/components/ui/CustomerNameText';
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
          ListHeaderComponent={
            syncing ? (
              <Text
                style={[
                  styles.syncHint,
                  { color: theme.colors.onSurfaceVariant },
                ]}>
                Loading full catalog…
              </Text>
            ) : null
          }
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
              <CustomerNameText
                size="title"
                style={styles.name}
                numberOfLines={viewMode === 'grid' ? 4 : 3}>
                {item.name}
              </CustomerNameText>
              <Text
                style={[
                  styles.sku,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={1}>
                {item.sku || '—'}
              </Text>
              <Text style={styles.price}>
                {formatMoney(item.price)} MMK
              </Text>
            </Pressable>
          )}
        />
      )}

      <AppFloatingSearchHeader
        footer={
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled">
            {categoryChips.map(cat => {
              const selected = category === cat;
              const label = cat || 'All';
              return (
                <Chip
                  key={cat || 'all'}
                  selected={selected}
                  showSelectedCheck={false}
                  compact
                  mode="outlined"
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected
                        ? theme.colors.primary
                        : 'transparent',
                      borderColor: selected
                        ? theme.colors.primary
                        : theme.colors.outline,
                    },
                  ]}
                  textStyle={[
                    styles.chipText,
                    {
                      color: selected
                        ? theme.colors.onPrimary
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}>
                  {label}
                </Chip>
              );
            })}
          </ScrollView>
        }>
        <AppSearchBar
          placeholder="Search products or SKU"
          value={query}
          onChangeText={setQuery}
          right={
            <AppSearchViewToggle mode={viewMode} onChange={setViewMode} />
          }
        />
      </AppFloatingSearchHeader>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chipsScroll: {
    flexGrow: 0,
  },
  chips: {
    paddingLeft: 12,
    paddingRight: 48,
    paddingTop: 2,
    paddingBottom: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  chip: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    height: undefined,
    minHeight: 36,
  },
  chipText: {
    textAlign: 'center',
    lineHeight: 22,
    marginVertical: 4,
    paddingHorizontal: 2,
  },
  syncHint: {
    paddingHorizontal: 4,
    paddingBottom: 8,
    fontSize: 12,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: {
    paddingHorizontal: 12,
    paddingTop: APP_FLOATING_SEARCH_WITH_CHIPS_INSET,
    paddingBottom: 32,
  },
  gridRow: { gap: 10 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    marginBottom: 10,
    overflow: 'visible',
  },
  gridCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
    marginBottom: 10,
    minHeight: 140,
    overflow: 'visible',
  },
  name: {
    fontWeight: '700',
  },
  sku: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
  },
  price: {
    marginTop: 10,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 22,
  },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.6 },
});
