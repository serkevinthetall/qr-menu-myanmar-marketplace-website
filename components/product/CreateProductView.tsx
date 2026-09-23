import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Checkbox,
  Chip,
  HelperText,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { DropdownField } from '@/components/ui/DropdownField';
import { useAuth } from '@/contexts/auth-context';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  createProduct,
  fetchProductCategories,
  fetchProductTags,
  fetchPublicCategories,
} from '@/services/products';
import {
  CreateProductPayload,
  ProductDetail,
  ProductNamedOption,
  ProductTag,
} from '@/types/product';

type CreateTab = 'general' | 'ecommerce';

type CreateProductViewProps = {
  onCancel: () => void;
  onCreated: (product: ProductDetail) => void;
};

const PRODUCT_TYPES = [
  { value: 'consu', label: 'Goods' },
  { value: 'service', label: 'Service' },
  { value: 'combo', label: 'Combo' },
] as const;

const INVOICE_POLICIES = [
  { value: 'order', label: 'Ordered quantities' },
  { value: 'delivery', label: 'Delivered quantities' },
];

function parseMoney(raw: string): number | undefined {
  const cleaned = raw.replace(/,/g, '').trim();
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function CreateProductView({
  onCancel,
  onCreated,
}: CreateProductViewProps) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const { session } = useAuth();
  const { width } = useResponsive();
  const isDesktop = width >= 900;

  const [tab, setTab] = useState<CreateTab>('general');
  const [name, setName] = useState('');
  const [saleOk, setSaleOk] = useState(true);
  const [purchaseOk, setPurchaseOk] = useState(true);
  const [productType, setProductType] =
    useState<(typeof PRODUCT_TYPES)[number]['value']>('consu');
  const [invoicePolicy, setInvoicePolicy] = useState('Ordered quantities');
  const [trackInventory, setTrackInventory] = useState(true);
  const [salesPrice, setSalesPrice] = useState('');
  const [cost, setCost] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  const [websitePublished, setWebsitePublished] = useState(false);
  const [websiteSequence, setWebsiteSequence] = useState('');
  const [selectedPublicCatIds, setSelectedPublicCatIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [sellWhenOutOfStock, setSellWhenOutOfStock] = useState(true);
  const [showAvailableQty, setShowAvailableQty] = useState(false);
  const [outOfStockMessage, setOutOfStockMessage] = useState('');
  const [longDescription, setLongDescription] = useState('');

  const [categories, setCategories] = useState<ProductNamedOption[]>([]);
  const [publicCategories, setPublicCategories] = useState<ProductNamedOption[]>(
    [],
  );
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;
    setMetaLoading(true);
    void Promise.all([
      fetchProductCategories(session.token),
      fetchPublicCategories(session.token),
      fetchProductTags(session.token),
    ])
      .then(([cats, pubCats, productTags]) => {
        if (cancelled) return;
        setCategories(cats);
        setPublicCategories(pubCats);
        setTags(productTags);
      })
      .catch(err => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : 'Could not load categories and tags.',
        );
      })
      .finally(() => {
        if (!cancelled) setMetaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.token]);

  const categoryOptions = useMemo(
    () => categories.map(c => c.name),
    [categories],
  );

  const selectedCategoryId = useMemo(() => {
    const match = categories.find(c => c.name === categoryName);
    return match?.id;
  }, [categories, categoryName]);

  const toggleId = useCallback((id: string, list: string[], setList: (next: string[]) => void) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  }, []);

  const save = useCallback(async () => {
    if (!session?.token) {
      setError('Not signed in.');
      return;
    }
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Product name is required.');
      setTab('general');
      return;
    }

    const listPrice = parseMoney(salesPrice);
    if (salesPrice.trim() && listPrice == null) {
      setError('Enter a valid sales price.');
      setTab('general');
      return;
    }
    const costValue = parseMoney(cost);
    if (cost.trim() && costValue == null) {
      setError('Enter a valid cost.');
      setTab('general');
      return;
    }

    const seqRaw = websiteSequence.replace(/,/g, '').trim();
    let websiteSequenceNum: number | undefined;
    if (seqRaw) {
      const n = Number(seqRaw);
      if (!Number.isFinite(n)) {
        setError('Enter a valid website sequence.');
        setTab('ecommerce');
        return;
      }
      websiteSequenceNum = Math.floor(n);
    }

    const invoicePolicyValue =
      invoicePolicy === 'Delivered quantities' ? 'delivery' : 'order';

    const payload: CreateProductPayload = {
      name: trimmedName,
      type: productType,
      saleOk,
      purchaseOk,
      trackInventory: productType === 'consu' ? trackInventory : false,
      invoicePolicy: invoicePolicyValue,
      listPrice,
      cost: costValue,
      categoryId: selectedCategoryId,
      sku: sku.trim() || undefined,
      barcode: barcode.trim() || undefined,
      internalNotes: internalNotes.trim() || undefined,
      websitePublished,
      websiteSequence: websiteSequenceNum,
      publicCategoryIds: selectedPublicCatIds,
      tagIds: selectedTagIds,
      sellWhenOutOfStock,
      showAvailableQty,
      outOfStockMessage: outOfStockMessage.trim() || undefined,
      longDescription: longDescription.trim() || undefined,
    };

    setSaving(true);
    setError('');
    try {
      const created = await createProduct(session.token, payload);
      onCreated(created);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create product.',
      );
    } finally {
      setSaving(false);
    }
  }, [
    session?.token,
    name,
    salesPrice,
    cost,
    websiteSequence,
    invoicePolicy,
    productType,
    saleOk,
    purchaseOk,
    trackInventory,
    selectedCategoryId,
    sku,
    barcode,
    internalNotes,
    websitePublished,
    selectedPublicCatIds,
    selectedTagIds,
    sellWhenOutOfStock,
    showAvailableQty,
    outOfStockMessage,
    longDescription,
    onCreated,
  ]);

  if (metaLoading) {
    return (
      <View style={[styles.center, { backgroundColor: detail.background }]}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
          Loading product form…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: detail.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <View
          style={[
            styles.surface,
            {
              backgroundColor: detail.surface,
              borderColor: detail.border,
              shadowColor: detail.shadow,
            },
          ]}>
          <TextInput
            mode="flat"
            label="Product Name"
            value={name}
            onChangeText={setName}
            style={styles.nameInput}
            dense
          />

          <View style={styles.checkRow}>
            <Pressable
              style={styles.checkItem}
              onPress={() => setSaleOk(v => !v)}>
              <Checkbox status={saleOk ? 'checked' : 'unchecked'} />
              <Text>Sales</Text>
            </Pressable>
            <Pressable
              style={styles.checkItem}
              onPress={() => setPurchaseOk(v => !v)}>
              <Checkbox status={purchaseOk ? 'checked' : 'unchecked'} />
              <Text>Purchase</Text>
            </Pressable>
          </View>

          <View style={[styles.tabBarRow, { borderBottomColor: detail.border }]}>
            {(
              [
                { key: 'general' as const, label: 'General Information' },
                { key: 'ecommerce' as const, label: 'eCommerce' },
              ] as const
            ).map(item => {
              const active = tab === item.key;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setTab(item.key)}
                  style={[
                    styles.tab,
                    active && { borderBottomColor: theme.colors.primary },
                  ]}>
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: active ? theme.colors.primary : detail.label,
                        fontWeight: active ? '700' : '600',
                      },
                    ]}>
                    {item.label.toUpperCase()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {tab === 'general' ? (
            <View style={[styles.tabBody, isDesktop && styles.tabBodyRow]}>
              <View style={[styles.col, isDesktop && styles.colHalf]}>
                <Text style={[styles.sectionLabel, { color: detail.label }]}>
                  Product Type
                </Text>
                <View style={styles.typeRow}>
                  {PRODUCT_TYPES.map(opt => (
                    <Pressable
                      key={opt.value}
                      style={styles.typeItem}
                      onPress={() => setProductType(opt.value)}>
                      <Checkbox
                        status={
                          productType === opt.value ? 'checked' : 'unchecked'
                        }
                      />
                      <Text>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <DropdownField
                  label="Invoicing Policy"
                  value={invoicePolicy}
                  options={INVOICE_POLICIES.map(p => p.label)}
                  onChange={setInvoicePolicy}
                />

                {productType === 'consu' ? (
                  <Pressable
                    style={styles.checkItem}
                    onPress={() => setTrackInventory(v => !v)}>
                    <Checkbox
                      status={trackInventory ? 'checked' : 'unchecked'}
                    />
                    <Text>Track Inventory</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={[styles.col, isDesktop && styles.colHalf]}>
                <TextInput
                  mode="outlined"
                  label="Sales Price (MMK)"
                  value={salesPrice}
                  onChangeText={setSalesPrice}
                  keyboardType="decimal-pad"
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="Cost (MMK)"
                  value={cost}
                  onChangeText={setCost}
                  keyboardType="decimal-pad"
                  dense
                />
                <DropdownField
                  label="Category"
                  value={categoryName}
                  options={categoryOptions}
                  onChange={setCategoryName}
                  placeholder="Select category"
                />
                <TextInput
                  mode="outlined"
                  label="Reference"
                  value={sku}
                  onChangeText={setSku}
                  dense
                />
                <TextInput
                  mode="outlined"
                  label="Barcode"
                  value={barcode}
                  onChangeText={setBarcode}
                  dense
                />
              </View>

              <View style={styles.fullWidth}>
                <Text style={[styles.sectionLabel, { color: detail.label }]}>
                  Internal Notes
                </Text>
                <TextInput
                  mode="outlined"
                  value={internalNotes}
                  onChangeText={setInternalNotes}
                  multiline
                  numberOfLines={4}
                  style={styles.notes}
                />
              </View>
            </View>
          ) : (
            <View style={styles.tabBody}>
              <Text style={[styles.sectionLabel, { color: detail.label }]}>
                Shop
              </Text>
              <View style={styles.switchRow}>
                <Text style={{ flex: 1 }}>Published</Text>
                <Switch
                  value={websitePublished}
                  onValueChange={setWebsitePublished}
                />
              </View>
              <TextInput
                mode="outlined"
                label="Website Sequence"
                value={websiteSequence}
                onChangeText={setWebsiteSequence}
                keyboardType="number-pad"
                dense
              />

              <Text
                style={[
                  styles.sectionLabel,
                  { color: detail.label, marginTop: 8 },
                ]}>
                Categories
              </Text>
              <View style={styles.chipWrap}>
                {publicCategories.length === 0 ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    No eCommerce categories in Odoo.
                  </Text>
                ) : (
                  publicCategories.map(cat => {
                    const selected = selectedPublicCatIds.includes(cat.id);
                    return (
                      <Chip
                        key={cat.id}
                        selected={selected}
                        onPress={() =>
                          toggleId(
                            cat.id,
                            selectedPublicCatIds,
                            setSelectedPublicCatIds,
                          )
                        }
                        style={styles.chip}>
                        {cat.name}
                      </Chip>
                    );
                  })
                )}
              </View>

              <Text
                style={[
                  styles.sectionLabel,
                  { color: detail.label, marginTop: 8 },
                ]}>
                Tags
              </Text>
              <View style={styles.chipWrap}>
                {tags.length === 0 ? (
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    No product tags in Odoo.
                  </Text>
                ) : (
                  tags.map(tag => {
                    const selected = selectedTagIds.includes(tag.id);
                    return (
                      <Chip
                        key={tag.id}
                        selected={selected}
                        onPress={() =>
                          toggleId(tag.id, selectedTagIds, setSelectedTagIds)
                        }
                        style={styles.chip}>
                        {tag.name}
                      </Chip>
                    );
                  })
                )}
              </View>

              <Text
                style={[
                  styles.sectionLabel,
                  { color: detail.label, marginTop: 12 },
                ]}>
                Inventory
              </Text>
              <Pressable
                style={styles.checkItem}
                onPress={() => setSellWhenOutOfStock(v => !v)}>
                <Checkbox
                  status={sellWhenOutOfStock ? 'checked' : 'unchecked'}
                />
                <Text>Sell when Out-of-Stock</Text>
              </Pressable>
              <Pressable
                style={styles.checkItem}
                onPress={() => setShowAvailableQty(v => !v)}>
                <Checkbox
                  status={showAvailableQty ? 'checked' : 'unchecked'}
                />
                <Text>Show Available Qty</Text>
              </Pressable>
              <TextInput
                mode="outlined"
                label="Out-of-Stock Message"
                value={outOfStockMessage}
                onChangeText={setOutOfStockMessage}
                placeholder="e.g. Will be back soon"
                dense
              />

              <Text
                style={[
                  styles.sectionLabel,
                  { color: detail.label, marginTop: 12 },
                ]}>
                Long Description
              </Text>
              <TextInput
                mode="outlined"
                value={longDescription}
                onChangeText={setLongDescription}
                multiline
                numberOfLines={5}
                style={styles.notes}
              />
            </View>
          )}

          {error ? (
            <HelperText type="error" visible>
              {error}
            </HelperText>
          ) : null}

          <View style={styles.actions}>
            <Button mode="outlined" onPress={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => void save()}
              loading={saving}
              disabled={saving}>
              Save
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  surface: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '700',
    backgroundColor: 'transparent',
  },
  checkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  tabBarRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
  tabBody: {
    gap: 12,
    paddingTop: 8,
  },
  tabBodyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
  col: {
    gap: 12,
    width: '100%',
  },
  colHalf: {
    width: '48%',
    minWidth: 260,
    flexGrow: 1,
  },
  fullWidth: {
    width: '100%',
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notes: {
    minHeight: 96,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 2,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
});
