import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  HelperText,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { DropdownField } from '@/components/ui/DropdownField';
import { SearchableDropdownField } from '@/components/ui/SearchableDropdownField';
import { useAuth } from '@/contexts/auth-context';
import { useResponsive } from '@/hooks/use-responsive';
import { createBillOfMaterials } from '@/services/bills-of-materials';
import {
  ensureWebProductCatalog,
  filterWebProducts,
  getWebProductCatalog,
  subscribeWebProductCatalog,
} from '@/services/web/product-catalog-cache';
import { Product } from '@/types/product';
import { BillOfMaterialsDetail } from '@/types/bill-of-materials';

type BomBuilderProps = {
  onCancel: () => void;
  onCreated: (bom: BillOfMaterialsDetail) => void;
};

type ComponentLine = {
  key: string;
  product: Product;
  qty: number;
};

const BOM_TYPES = [
  { value: 'normal', label: 'Manufacture this product' },
  { value: 'phantom', label: 'Kit' },
];

export function BomBuilder({ onCancel, onCreated }: BomBuilderProps) {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reference, setReference] = useState('');
  const [bomType, setBomType] = useState('Manufacture this product');
  const [componentQuery, setComponentQuery] = useState('');
  const [lines, setLines] = useState<ComponentLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return subscribeWebProductCatalog(catalog => {
      setProducts(catalog.products);
    });
  }, []);

  useEffect(() => {
    if (!session?.token) return;
    const cached = getWebProductCatalog();
    if (cached?.products.length) {
      setProducts(cached.products);
      return;
    }
    setProductsLoading(true);
    void ensureWebProductCatalog(session.token)
      .then(catalog => setProducts(catalog.products))
      .catch(() => setError('Could not load products from Odoo.'))
      .finally(() => setProductsLoading(false));
  }, [session?.token]);

  const productOptions = useMemo(
    () => products.map(p => p.name).filter(Boolean),
    [products],
  );

  const selectedProduct = useMemo(
    () => products.find(p => p.name === productName) ?? null,
    [products, productName],
  );

  const filteredComponents = useMemo(
    () => filterWebProducts(products, { q: componentQuery }).slice(0, 40),
    [products, componentQuery],
  );

  const addComponent = useCallback((product: Product) => {
    setLines(prev => {
      const existing = prev.find(l => l.product.id === product.id);
      if (existing) {
        return prev.map(l =>
          l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        { key: `${product.id}-${Date.now()}`, product, qty: 1 },
      ];
    });
    setComponentQuery('');
  }, []);

  const updateQty = useCallback((key: string, qty: number) => {
    setLines(prev => prev.map(l => (l.key === key ? { ...l, qty } : l)));
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines(prev => prev.filter(l => l.key !== key));
  }, []);

  const save = useCallback(async () => {
    if (!session?.token) {
      setError('Not signed in.');
      return;
    }
    if (!selectedProduct) {
      setError('Select a product for this BoM.');
      return;
    }
    if (lines.length === 0) {
      setError('Add at least one component.');
      return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }

    const typeValue =
      BOM_TYPES.find(t => t.label === bomType)?.value ?? 'normal';

    setSaving(true);
    setError('');
    try {
      const created = await createBillOfMaterials(session.token, {
        productId: selectedProduct.id,
        quantity: qty,
        code: reference.trim() || undefined,
        type: typeValue,
        lines: lines.map(line => ({
          productId: line.product.id,
          quantity: line.qty,
        })),
      });
      onCreated(created);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to create bill of materials in Odoo.',
      );
    } finally {
      setSaving(false);
    }
  }, [
    session?.token,
    selectedProduct,
    lines,
    quantity,
    reference,
    bomType,
    onCreated,
  ]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.toolbar,
          { borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline },
        ]}>
        <View style={styles.toolbarLeft}>
          <Button mode="text" onPress={onCancel} disabled={saving}>
            Discard
          </Button>
          <Button mode="contained" onPress={() => void save()} loading={saving}>
            Save
          </Button>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <Text variant="headlineSmall" style={styles.title}>
          New
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
          Bill of Materials
        </Text>

        {error ? (
          <HelperText type="error" visible style={styles.error}>
            {error}
          </HelperText>
        ) : null}

        <View style={[styles.metaGrid, !isDesktop && styles.metaGridStack]}>
          <View style={styles.metaCol}>
            <Text variant="labelMedium" style={styles.fieldLabel}>
              Product
            </Text>
            {productsLoading ? (
              <ActivityIndicator style={{ marginVertical: 8 }} />
            ) : (
              <SearchableDropdownField
                value={productName}
                options={productOptions}
                onChange={setProductName}
                placeholder="Product"
                sortOptions={false}
                clearLabel="Clear"
                emptyLabel="No products match"
              />
            )}
            <TextInput
              mode="outlined"
              dense
              label="Reference"
              value={reference}
              onChangeText={setReference}
              style={styles.field}
            />
          </View>
          <View style={styles.metaCol}>
            <TextInput
              mode="outlined"
              dense
              label="Quantity"
              keyboardType="decimal-pad"
              value={quantity}
              onChangeText={setQuantity}
              style={styles.field}
            />
            <View style={{ height: 8 }} />
            <DropdownField
              label="BoM Type"
              value={bomType}
              options={BOM_TYPES.map(t => t.label)}
              onChange={setBomType}
              showClearOption={false}
              sortOptions={false}
            />
          </View>
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Components
        </Text>

        <View
          style={[
            styles.tableHeader,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}>
          <Text style={[styles.th, styles.colProduct]}>Component</Text>
          <Text style={[styles.th, styles.colQty]}>Quantity</Text>
          <View style={styles.colAction} />
        </View>

        {lines.map(line => (
          <View
            key={line.key}
            style={[
              styles.tableRow,
              {
                borderBottomColor:
                  theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}>
            <Text style={[styles.colProduct, styles.productName]} numberOfLines={2}>
              {line.product.name}
            </Text>
            <TextInput
              mode="outlined"
              dense
              keyboardType="decimal-pad"
              value={String(line.qty)}
              onChangeText={text => {
                const n = Number(text);
                updateQty(line.key, Number.isFinite(n) && n > 0 ? n : 0);
              }}
              style={styles.colQty}
            />
            <IconButton
              icon="trash-can-outline"
              size={18}
              onPress={() => removeLine(line.key)}
              style={styles.colAction}
            />
          </View>
        ))}

        <View style={styles.addProduct}>
          <TextInput
            mode="outlined"
            dense
            placeholder="Add a component…"
            value={componentQuery}
            onChangeText={setComponentQuery}
            left={<TextInput.Icon icon="magnify" />}
            style={{ flex: 1 }}
          />
        </View>

        {componentQuery.trim() ? (
          <View
            style={[
              styles.productResults,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}>
            {filteredComponents.length === 0 ? (
              <Text style={{ padding: 12, color: theme.colors.onSurfaceVariant }}>
                No matching products.
              </Text>
            ) : (
              <ScrollView
                style={styles.productResultsScroll}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled">
                {filteredComponents.map(product => (
                  <Pressable
                    key={product.id}
                    onPress={() => addComponent(product)}
                    style={[
                      styles.productResultRow,
                      {
                        borderBottomColor:
                          theme.colors.outlineVariant ?? theme.colors.outline,
                      },
                    ]}>
                    <Text numberOfLines={1} style={{ flex: 1, fontWeight: '600' }}>
                      {product.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  title: { fontWeight: '700' },
  error: { marginBottom: 8 },
  metaGrid: { flexDirection: 'row', gap: 24, marginBottom: 24 },
  metaGridStack: { flexDirection: 'column', gap: 12 },
  metaCol: { flex: 1, gap: 4 },
  fieldLabel: { marginBottom: 4, fontWeight: '600' },
  field: { marginTop: 8 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  th: { fontWeight: '700', fontSize: 12 },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  colProduct: { flex: 2.4, minWidth: 0 },
  colQty: { width: 100 },
  colAction: { width: 36 },
  productName: { fontWeight: '600', fontSize: 13, paddingRight: 6 },
  addProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  productResults: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    maxHeight: 280,
    overflow: 'hidden',
  },
  productResultsScroll: { maxHeight: 280 },
  productResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
