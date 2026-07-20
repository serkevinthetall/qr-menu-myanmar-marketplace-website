import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Card,
  Checkbox,
  Chip,
  Text,
  useTheme,
} from 'react-native-paper';

import { Pagination } from '@/components/ui/Pagination';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  ensureWebProductCatalog,
  filterWebProducts,
  subscribeWebProductCatalog,
  WebProductCatalog,
} from '@/services/web/product-catalog-cache';
import { Product } from '@/types/product';

const PAGE_SIZE = 50;

type ViewMode = 'list' | 'card';

type Column = {
  key: string;
  label: string;
  flex: number;
  align?: 'left' | 'right';
};

const COLUMNS: Column[] = [
  { key: 'name', label: 'Name', flex: 2.6 },
  { key: 'sku', label: 'SKU', flex: 1.8 },
  { key: 'price', label: 'Price', flex: 1.6, align: 'right' },
  { key: 'stock', label: 'Stock', flex: 1, align: 'right' },
  { key: 'status', label: 'Status', flex: 1.2 },
];

function formatPrice(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function statusColors(active: boolean): { bg: string; fg: string } {
  return active
    ? { bg: '#DCFCE7', fg: '#166534' }
    : { bg: '#FEE2E2', fg: '#991B1B' };
}

function StatusBadge({ active }: { active: boolean }) {
  const { bg, fg } = statusColors(active);
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Text variant="labelSmall" numberOfLines={1} style={{ color: fg, fontWeight: '600' }}>
        {active ? 'Active' : 'Inactive'}
      </Text>
    </View>
  );
}

function cellText(item: Product, key: string): string {
  switch (key) {
    case 'name':
      return item.name;
    case 'sku':
      return item.sku;
    case 'price':
      return `${formatPrice(item.price)} MMK`;
    case 'stock':
      return String(item.stock);
    default:
      return '';
  }
}

function ProductRow({
  item,
  index,
  selected,
  onToggle,
}: {
  item: Product;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const theme = useTheme();
  const zebra = index % 2 === 1;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: selected
            ? theme.colors.primaryContainer
            : zebra
              ? theme.colors.surfaceVariant
              : theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}>
      <View style={styles.checkCell}>
        <Checkbox
          status={selected ? 'checked' : 'unchecked'}
          onPress={() => onToggle(item.id)}
        />
      </View>
      {COLUMNS.map(col => {
        if (col.key === 'name') {
          return (
            <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
              <View style={styles.nameCell}>
                <ProductThumb uri={item.image} size={36} />
                <Text numberOfLines={1} style={styles.nameText}>
                  {item.name}
                </Text>
              </View>
            </View>
          );
        }

        if (col.key === 'status') {
          return (
            <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
              <StatusBadge active={item.active} />
            </View>
          );
        }

        const text = cellText(item, col.key);
        const isName = col.key === 'name';
        return (
          <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
            <Text
              numberOfLines={1}
              style={{
                textAlign: col.align === 'right' ? 'right' : 'left',
                fontWeight: isName ? '600' : '400',
                color: text
                  ? theme.colors.onSurface
                  : theme.colors.onSurfaceVariant,
              }}>
              {text || '—'}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function TableHeader({
  status,
  onToggleAll,
}: {
  status: 'checked' | 'unchecked' | 'indeterminate';
  onToggleAll: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        styles.headerRow,
        { backgroundColor: theme.colors.primary },
      ]}>
      <View style={styles.checkCell}>
        <Checkbox
          status={status}
          onPress={onToggleAll}
          color={theme.colors.onPrimary}
          uncheckedColor={theme.colors.onPrimary}
        />
      </View>
      {COLUMNS.map(col => (
        <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
          <Text
            variant="labelMedium"
            numberOfLines={1}
            style={{
              color: theme.colors.onPrimary,
              fontWeight: '700',
              textAlign: col.align === 'right' ? 'right' : 'left',
            }}>
            {col.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ProductCard({ item }: { item: Product }) {
  const theme = useTheme();

  return (
    <Card
      mode="elevated"
      style={[
        styles.productCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
        },
      ]}>
      <Card.Content style={styles.cardContent}>
        <ProductThumb uri={item.image} size={120} style={styles.cardImage} />
        <View style={styles.cardTop}>
          <Text variant="titleMedium" style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          {item.active ? (
            <Chip
              compact
              style={{ backgroundColor: theme.colors.secondaryContainer }}>
              Active
            </Chip>
          ) : (
            <Chip compact style={styles.inactiveChip}>
              Inactive
            </Chip>
          )}
        </View>

        {item.sku ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            SKU: {item.sku}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <View>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Price
            </Text>
            <Text variant="titleLarge" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {formatPrice(item.price)} MMK
            </Text>
          </View>
          <View style={styles.stockBox}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Stock
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.secondary, fontWeight: '600' }}>
              {item.stock}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

export default function ProductsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogComplete, setCatalogComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const query = useModuleSearch('Search products by name or SKU');

  const toggleOne = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleView = useCallback(() => {
    setViewMode(prev => (prev === 'list' ? 'card' : 'list'));
  }, []);

  const headerActions = useMemo<HeaderAction[]>(
    () => [
      {
        key: 'view',
        icon: viewMode === 'list' ? 'view-grid-outline' : 'format-list-bulleted',
        onPress: toggleView,
        accessibilityLabel: 'Toggle list or card view',
      },
    ],
    [viewMode, toggleView],
  );

  useHeaderActions(headerActions);

  const filteredProducts = useMemo(
    () => filterWebProducts(products, { q: query }),
    [products, query],
  );

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [query, viewMode]);

  const pagedProducts = useMemo(
    () => filteredProducts.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredProducts, safePage],
  );

  const selectedOnPage = pagedProducts.reduce(
    (count, product) => count + (selectedIds.has(product.id) ? 1 : 0),
    0,
  );
  const headerStatus: 'checked' | 'unchecked' | 'indeterminate' =
    selectedOnPage === 0
      ? 'unchecked'
      : selectedOnPage === pagedProducts.length
        ? 'checked'
        : 'indeterminate';

  const toggleAllOnPage = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const ids = pagedProducts.map(product => product.id);
      const allSelected = ids.length > 0 && ids.every(id => next.has(id));
      ids.forEach(id => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }, [pagedProducts]);

  const numColumns = useMemo(() => {
    if (width >= 1200) {
      return 3;
    }
    if (width >= 768) {
      return 2;
    }
    return 1;
  }, [width]);

  const cardWidth = useMemo(() => {
    const horizontalPadding = 32;
    const gap = 12;
    const available = width - horizontalPadding - gap * (numColumns - 1);
    return available / numColumns;
  }, [width, numColumns]);

  const loadProducts = useCallback(
    async (force = false) => {
      if (!session?.token) {
        return;
      }

      try {
        setError('');
        await ensureWebProductCatalog(session.token, { force });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products.');
      }
    },
    [session?.token],
  );

  useEffect(() => {
    return subscribeWebProductCatalog((catalog: WebProductCatalog) => {
      setProducts(catalog.products);
      setCatalogComplete(catalog.complete);
      if (catalog.products.length > 0 || catalog.complete) {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    loadProducts(false).finally(() => setLoading(false));
  }, [loadProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts(true);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12 }}>Loading products from Odoo...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text variant="titleMedium" style={styles.errorTitle}>
          Could not load products
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {!catalogComplete ? (
        <Text
          style={{
            paddingHorizontal: 16,
            paddingTop: 8,
            fontSize: 12,
            color: theme.colors.onSurfaceVariant,
          }}>
          Loading full catalog…
        </Text>
      ) : null}
      {viewMode === 'list' ? (
        filteredProducts.length === 0 ? (
          <ScrollView
            style={styles.tableScroll}
            contentContainerStyle={styles.tableEmptyContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }>
            <Text style={styles.empty}>
              {query.trim()
                ? `No products match "${query.trim()}".`
                : 'No products found in Odoo.'}
            </Text>
          </ScrollView>
        ) : (
          <View style={styles.tableScroll}>
            <TableHeader status={headerStatus} onToggleAll={toggleAllOnPage} />
            <ScrollView
              style={styles.listBody}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }>
              {pagedProducts.map((item, index) => (
                <ProductRow
                  key={item.id}
                  item={item}
                  index={index}
                  selected={selectedIds.has(item.id)}
                  onToggle={toggleOne}
                />
              ))}
            </ScrollView>
          </View>
        )
      ) : (
        <FlatList
          key={numColumns}
          data={pagedProducts}
          numColumns={numColumns}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          renderItem={({ item }) => (
            <View style={[styles.cardWrapper, { width: numColumns > 1 ? cardWidth : '100%' }]}>
              <ProductCard item={item} />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim()
                ? `No products match "${query.trim()}".`
                : 'No products found in Odoo.'}
            </Text>
          }
        />
      )}

      <Pagination
        page={safePage}
        pageCount={pageCount}
        total={filteredProducts.length}
        pageSize={PAGE_SIZE}
        onChange={setPage}
        centerLabel={`${products.length} from Odoo`}
      />
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
  tableScroll: {
    flex: 1,
  },
  listBody: {
    flex: 1,
  },
  tableEmptyContent: {
    flexGrow: 1,
  },
  table: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  headerRow: {
    minHeight: 44,
  },
  cell: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    minWidth: 0,
  },
  nameCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    flex: 1,
    fontWeight: '600',
  },
  checkCell: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ scale: 0.8 }],
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    maxWidth: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  columnWrapper: {
    gap: 12,
    marginBottom: 12,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  productCard: {
    borderRadius: 12,
    borderWidth: 1,
  },
  cardContent: {
    gap: 10,
  },
  cardImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    alignSelf: 'center',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  productName: {
    flex: 1,
    fontWeight: '600',
  },
  inactiveChip: {
    backgroundColor: '#FEE2E2',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  stockBox: {
    alignItems: 'flex-end',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    opacity: 0.7,
  },
  errorTitle: {
    marginBottom: 8,
    fontWeight: '600',
  },
});
