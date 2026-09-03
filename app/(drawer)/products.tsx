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
  Card,
  Checkbox,
  Text,
  useTheme,
} from 'react-native-paper';

import { ProductDetailView } from '@/components/product/ProductDetailView';
import { FavoriteStar } from '@/components/ui/FavoriteStar';
import { Pagination } from '@/components/ui/Pagination';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { useAuth } from '@/contexts/auth-context';
import {
  HeaderAction,
  useHeaderActions,
  useModuleSearch,
  useSearch,
} from '@/contexts/search-context';
import { useResponsive } from '@/hooks/use-responsive';
import {
  fetchProductDetail,
  fetchProductsPage,
  setProductFavorite,
  updateProductAppAccess,
  updateProductPrices,
} from '@/services/products';
import { fetchContactTags } from '@/services/customers';
import {
  ensureWebProductCatalog,
  filterWebProducts,
  patchWebProductFavorite,
  patchWebProductPrice,
  subscribeWebProductCatalog,
  WebProductCatalog,
} from '@/services/web/product-catalog-cache';
import {
  Product,
  ProductDetail,
  ProductPricesUpdate,
  ProductTag,
} from '@/types/product';
import { asIdSet, useListUiCache } from '@/utils/list-ui-cache';

const PAGE_SIZE = 50;
const QR_APP_PAGE_SIZE = 500;

type ViewMode = 'list' | 'card';

type ProductsListUi = {
  viewMode: ViewMode;
  qrAppFilter: boolean;
  selectedIds: string[];
};

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
  onOpen,
  onToggleFavorite,
  favoriteBusy,
}: {
  item: Product;
  index: number;
  selected: boolean;
  onToggle: (id: string) => void;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string, next: boolean) => void;
  favoriteBusy: boolean;
}) {
  const theme = useTheme();
  const zebra = index % 2 === 1;

  return (
    <Pressable
      onPress={() => onOpen(item.id)}
      style={({ hovered, pressed }) => [
        styles.row,
        {
          backgroundColor: selected
            ? theme.colors.primaryContainer
            : hovered
              ? theme.colors.primaryContainer
              : zebra
                ? theme.colors.surfaceVariant
                : theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
          opacity: pressed ? 0.9 : 1,
        },
      ]}>
      <View style={styles.checkCell}>
        <Checkbox
          status={selected ? 'checked' : 'unchecked'}
          onPress={() => onToggle(item.id)}
        />
      </View>
      <View style={styles.starCell}>
        <FavoriteStar
          favorite={Boolean(item.favorite)}
          disabled={favoriteBusy}
          onToggle={() => onToggleFavorite(item.id, !item.favorite)}
        />
      </View>
      {COLUMNS.map(col => {
        if (col.key === 'name') {
          return (
            <View key={col.key} style={[styles.cell, { flex: col.flex }]}>
              <View style={styles.nameCell}>
                <ProductThumb productId={item.id} size={36} />
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
    </Pressable>
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
      <View style={styles.starCell} />
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

function ProductCard({
  item,
  onOpen,
  onToggleFavorite,
  favoriteBusy,
}: {
  item: Product;
  onOpen: (id: string) => void;
  onToggleFavorite: (id: string, next: boolean) => void;
  favoriteBusy: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable onPress={() => onOpen(item.id)} style={styles.cardPressable}>
      <Card
        mode="elevated"
        style={[
          styles.productCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}>
        <View style={styles.cardImageRow}>
          <ProductThumb productId={item.id} size={160} style={styles.cardImage} />
          <View style={styles.cardStar}>
            <FavoriteStar
              favorite={Boolean(item.favorite)}
              disabled={favoriteBusy}
              onToggle={() => onToggleFavorite(item.id, !item.favorite)}
            />
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <Text
              variant="titleSmall"
              style={styles.productName}
              numberOfLines={2}>
              {item.name}
            </Text>
            <View
              style={[
                styles.statusBadge,
                item.active
                  ? { backgroundColor: theme.colors.secondaryContainer }
                  : styles.inactiveChip,
              ]}>
              <Text
                variant="labelSmall"
                style={{
                  color: item.active
                    ? theme.colors.onSecondaryContainer
                    : '#991B1B',
                  fontWeight: '700',
                }}
                numberOfLines={1}>
                {item.active ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          {item.sku ? (
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
              numberOfLines={1}>
              SKU: {item.sku}
            </Text>
          ) : null}

          <View style={styles.cardFooter}>
            <View style={styles.metricBox}>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant }}>
                Price
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.primary, fontWeight: '700' }}
                numberOfLines={1}>
                {formatPrice(item.price)} MMK
              </Text>
            </View>
            <View style={[styles.metricBox, styles.stockBox]}>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant }}>
                Stock
              </Text>
              <Text
                variant="titleSmall"
                style={{ color: theme.colors.secondary, fontWeight: '700' }}
                numberOfLines={1}>
                {item.stock}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
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
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [pricesSaving, setPricesSaving] = useState(false);
  const [pricesError, setPricesError] = useState('');
  const [contactTags, setContactTags] = useState<ProductTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [appBusy, setAppBusy] = useState(false);
  const [appError, setAppError] = useState('');
  const [qrAppFilter, setQrAppFilter] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [favoriteBusyId, setFavoriteBusyId] = useState<string | null>(null);

  const listUiSnapshot = useMemo<ProductsListUi>(
    () => ({
      viewMode,
      qrAppFilter,
      selectedIds: [...selectedIds],
    }),
    [viewMode, qrAppFilter, selectedIds],
  );

  useListUiCache<ProductsListUi>('products', listUiSnapshot, saved => {
    if (saved.viewMode === 'list' || saved.viewMode === 'card') {
      setViewMode(saved.viewMode);
    }
    if (typeof saved.qrAppFilter === 'boolean') {
      setQrAppFilter(saved.qrAppFilter);
    }
    if (saved.selectedIds) {
      setSelectedIds(asIdSet(saved.selectedIds));
    }
  });

  const query = useModuleSearch('Search products by name or SKU', !detailId);
  const { setDetailHeader } = useSearch();

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

  const openDetail = useCallback(
    async (id: string) => {
      if (!session?.token) return;
      setDetailId(id);
      setDetail(null);
      setDetailLoading(true);
      setDetailError('');
      try {
        const data = await fetchProductDetail(session.token, id);
        setDetail(data);
      } catch (err) {
        setDetailError(
          err instanceof Error ? err.message : 'Failed to load product.',
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [session?.token],
  );

  const closeDetail = useCallback(() => {
    setDetailId(null);
    setDetail(null);
    setDetailError('');
    setPricesError('');
    setAppError('');
    setAppBusy(false);
  }, []);

  const loadContactTags = useCallback(async () => {
    if (!session?.token) return;
    setTagsLoading(true);
    try {
      const tags = await fetchContactTags(session.token);
      setContactTags(tags);
    } catch {
      setContactTags([]);
    } finally {
      setTagsLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    if (detailId) {
      void loadContactTags();
    }
  }, [detailId, loadContactTags]);

  const setVisibleToApp = useCallback(
    async (visible: boolean) => {
      if (!session?.token || !detailId) return;
      setAppError('');

      // Flip UI immediately; sync to Odoo in the background.
      let snapshot: ProductDetail | null = null;
      setDetail(prev => {
        snapshot = prev;
        if (!prev?.appAccess) return prev;
        const tags = prev.appAccess.tags ?? [];
        const withoutQr = tags.filter(
          tag => tag.name.trim().toLowerCase() !== 'qr app',
        );
        const nextTags = visible
          ? [...withoutQr, { id: 'qr-app-optimistic', name: 'QR App' }]
          : withoutQr;
        return {
          ...prev,
          appAccess: {
            ...prev.appAccess,
            websitePublished: visible,
            hasQrAppTag: visible,
            saleOk: visible ? true : prev.appAccess.saleOk,
            tags: nextTags,
            tagIds: nextTags.map(tag => tag.id),
            readyForApp:
              (visible ? true : prev.appAccess.saleOk) &&
              visible &&
              prev.appAccess.hasEcommerceCategory,
          },
        };
      });

      setAppBusy(true);
      try {
        const appAccess = await updateProductAppAccess(session.token, detailId, {
          enableQrApp: visible,
        });
        setDetail(prev => (prev ? { ...prev, appAccess } : prev));
      } catch (err) {
        if (snapshot) {
          setDetail(snapshot);
        }
        setAppError(
          err instanceof Error
            ? err.message
            : visible
              ? 'Failed to make product visible to app.'
              : 'Failed to hide product from app.',
        );
        throw err;
      } finally {
        setAppBusy(false);
      }
    },
    [session?.token, detailId],
  );

  const updateAppAccess = useCallback(
    async (updates: {
      websitePublished?: boolean;
      tagIds?: string[];
      forYouTagIds?: string[];
    }) => {
      if (!session?.token || !detailId) return;
      setAppBusy(true);
      setAppError('');
      try {
        const appAccess = await updateProductAppAccess(
          session.token,
          detailId,
          updates,
        );
        setDetail(prev => (prev ? { ...prev, appAccess } : prev));
      } catch (err) {
        setAppError(
          err instanceof Error
            ? err.message
            : 'Failed to update app settings.',
        );
        throw err;
      } finally {
        setAppBusy(false);
      }
    },
    [session?.token, detailId],
  );

  const savePrices = useCallback(
    async (updates: ProductPricesUpdate) => {
      if (!session?.token || !detailId) return;
      setPricesSaving(true);
      setPricesError('');
      try {
        const saved = await updateProductPrices(session.token, detailId, updates);
        setDetail(prev =>
          prev
            ? {
                ...prev,
                price: saved.price,
                premiumPrice: saved.premiumPrice ?? prev.premiumPrice,
                proPrice: saved.proPrice ?? prev.proPrice,
              }
            : prev,
        );
        if (updates.salesPrice !== undefined) {
          setProducts(prev =>
            prev.map(p =>
              p.id === detailId ? { ...p, price: updates.salesPrice! } : p,
            ),
          );
          setCatalogProducts(prev =>
            prev.map(p =>
              p.id === detailId ? { ...p, price: updates.salesPrice! } : p,
            ),
          );
          if (!qrAppFilter) {
            patchWebProductPrice(detailId, updates.salesPrice);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save prices.';
        setPricesError(message);
        throw err instanceof Error ? err : new Error(message);
      } finally {
        setPricesSaving(false);
      }
    },
    [session?.token, detailId, qrAppFilter],
  );

  const toggleFavorite = useCallback(
    async (id: string, next: boolean) => {
      if (!session?.token || favoriteBusyId) return;

      const listed = products.find(p => p.id === id);
      const previous =
        listed?.favorite !== undefined
          ? Boolean(listed.favorite)
          : detail?.id === id
            ? Boolean(detail.favorite)
            : false;

      setFavoriteBusyId(id);
      setProducts(prev => prev.map(p => (p.id === id ? { ...p, favorite: next } : p)));
      setCatalogProducts(prev =>
        prev.map(p => (p.id === id ? { ...p, favorite: next } : p)),
      );
      if (!qrAppFilter) {
        patchWebProductFavorite(id, next);
      }
      if (detail?.id === id) {
        setDetail(prev => (prev ? { ...prev, favorite: next } : prev));
      }

      try {
        await setProductFavorite(session.token, id, next);
      } catch (err) {
        setProducts(prev =>
          prev.map(p => (p.id === id ? { ...p, favorite: previous } : p)),
        );
        setCatalogProducts(prev =>
          prev.map(p => (p.id === id ? { ...p, favorite: previous } : p)),
        );
        if (!qrAppFilter) {
          patchWebProductFavorite(id, previous);
        }
        if (detail?.id === id) {
          setDetail(prev => (prev ? { ...prev, favorite: previous } : prev));
        }
        setError(
          err instanceof Error ? err.message : 'Failed to update favorite.',
        );
      } finally {
        setFavoriteBusyId(null);
      }
    },
    [session?.token, favoriteBusyId, products, detail, qrAppFilter],
  );

  useEffect(() => {
    if (!detailId) {
      setDetailHeader(null);
      return;
    }

    setDetailHeader({
      title: detail?.name ?? 'Product',
      onBack: closeDetail,
      statusLabel: detail
        ? detail.active
          ? 'Active'
          : 'Inactive'
        : undefined,
      breadcrumbParent: 'Product',
    });

    return () => setDetailHeader(null);
  }, [detailId, detail, closeDetail, setDetailHeader]);

  const toggleView = useCallback(() => {
    setViewMode(prev => (prev === 'list' ? 'card' : 'list'));
  }, []);

  const toggleQrAppFilter = useCallback(() => {
    setQrAppFilter(prev => !prev);
  }, []);

  const headerActions = useMemo<HeaderAction[]>(() => {
    if (detailId) {
      return [];
    }
    return [
      {
        key: 'qr-app',
        label: 'QR App',
        icon: qrAppFilter ? 'check-circle' : 'tag-outline',
        active: qrAppFilter,
        onPress: toggleQrAppFilter,
        accessibilityLabel:
          'Filter products that are for sale, published, and tagged QR App',
      },
      {
        key: 'view',
        icon: viewMode === 'list' ? 'view-grid-outline' : 'format-list-bulleted',
        onPress: toggleView,
        accessibilityLabel: 'Toggle list or card view',
      },
    ];
  }, [detailId, viewMode, toggleView, qrAppFilter, toggleQrAppFilter]);

  useHeaderActions(headerActions);

  const filteredProducts = useMemo(
    () => filterWebProducts(products, { q: query }),
    [products, query],
  );

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    setPage(1);
  }, [query, viewMode, qrAppFilter]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [query, qrAppFilter]);

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
      return 7;
    }
    if (width >= 1000) {
      return 5;
    }
    if (width >= 800) {
      return 4;
    }
    if (width >= 600) {
      return 3;
    }
    if (width >= 420) {
      return 2;
    }
    return 1;
  }, [width]);

  const cardWidth = useMemo(() => {
    const horizontalPadding = 32;
    const gap = 8;
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
        if (qrAppFilter) {
          const page = await fetchProductsPage(session.token, {
            limit: QR_APP_PAGE_SIZE,
            offset: 0,
            filter: 'qrApp',
          });
          setProducts(page.data);
          setCatalogComplete(true);
          return;
        }

        await ensureWebProductCatalog(session.token, { force });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load products.');
      }
    },
    [session?.token, qrAppFilter],
  );

  useEffect(() => {
    return subscribeWebProductCatalog((catalog: WebProductCatalog) => {
      setCatalogProducts(catalog.products);
      if (!qrAppFilter) {
        setProducts(catalog.products);
        setCatalogComplete(catalog.complete);
        if (catalog.products.length > 0 || catalog.complete) {
          setLoading(false);
        }
      }
    });
  }, [qrAppFilter]);

  useEffect(() => {
    if (!qrAppFilter && catalogProducts.length > 0) {
      setProducts(catalogProducts);
      setLoading(false);
    }
  }, [qrAppFilter, catalogProducts]);

  useEffect(() => {
    setLoading(true);
    loadProducts(false).finally(() => setLoading(false));
  }, [loadProducts]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts(true);
    setRefreshing(false);
  };

  if (detailId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <ProductDetailView
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onToggleFavorite={next => {
            if (detailId) void toggleFavorite(detailId, next);
          }}
          favoriteBusy={favoriteBusyId === detailId}
          onSavePrices={savePrices}
          pricesSaving={pricesSaving}
          pricesError={pricesError}
          contactTags={contactTags}
          contactTagsLoading={tagsLoading}
          appBusy={appBusy}
          appError={appError}
          onSetVisibleToApp={setVisibleToApp}
          onUpdateAppAccess={updateAppAccess}
        />
      </View>
    );
  }

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
                : qrAppFilter
                  ? 'No QR App products found (sale + published + QR App tag).'
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
                  onOpen={openDetail}
                  onToggleFavorite={toggleFavorite}
                  favoriteBusy={favoriteBusyId === item.id}
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
              <ProductCard
                item={item}
                onOpen={openDetail}
                onToggleFavorite={toggleFavorite}
                favoriteBusy={favoriteBusyId === item.id}
              />
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim()
                ? `No products match "${query.trim()}".`
                : qrAppFilter
                  ? 'No QR App products found (sale + published + QR App tag).'
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
        centerLabel={
          qrAppFilter
            ? `${filteredProducts.length} QR App`
            : `${products.length} from Odoo`
        }
        itemLabel="product"
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
  starCell: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 8,
    marginBottom: 8,
  },
  cardWrapper: {
    marginBottom: 8,
    alignSelf: 'stretch',
  },
  cardPressable: {
    flex: 1,
  },
  productCard: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImageRow: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardStar: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 2,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 4,
  },
  productName: {
    flex: 1,
    fontWeight: '700',
    lineHeight: 18,
    fontSize: 13,
  },
  inactiveChip: {
    backgroundColor: '#FEE2E2',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 2,
  },
  metricBox: {
    flexShrink: 1,
    minWidth: 0,
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
