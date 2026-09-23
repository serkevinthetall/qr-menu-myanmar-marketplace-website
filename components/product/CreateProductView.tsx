import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Checkbox,
  Chip,
  Dialog,
  HelperText,
  Portal,
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
  createProductTag,
  createPublicCategory,
  fetchNextWebsiteSequence,
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

type SuggestKind = 'category' | 'tag';

type PendingCreate = {
  kind: SuggestKind;
  name: string;
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

function SuggestCreateField({
  label,
  placeholder,
  options,
  selected,
  onChangeSelected,
  onRequestCreate,
  creating,
}: {
  label: string;
  placeholder: string;
  options: ProductNamedOption[];
  selected: ProductNamedOption[];
  onChangeSelected: (next: ProductNamedOption[]) => void;
  onRequestCreate: (name: string) => void;
  creating?: boolean;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  const selectedIds = useMemo(
    () => new Set(selected.map(item => item.id)),
    [selected],
  );

  const trimmed = query.trim();
  const suggestions = useMemo(() => {
    if (!trimmed) return [];
    const q = trimmed.toLowerCase();
    return options
      .filter(
        opt =>
          !selectedIds.has(opt.id) && opt.name.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [options, selectedIds, trimmed]);

  const exactMatch = useMemo(() => {
    if (!trimmed) return null;
    const q = trimmed.toLowerCase();
    return (
      options.find(opt => opt.name.toLowerCase() === q) ??
      selected.find(opt => opt.name.toLowerCase() === q) ??
      null
    );
  }, [options, selected, trimmed]);

  const showCreateHint = Boolean(trimmed) && !exactMatch;

  const addOption = useCallback(
    (opt: ProductNamedOption) => {
      if (selectedIds.has(opt.id)) {
        setQuery('');
        return;
      }
      onChangeSelected([...selected, opt]);
      setQuery('');
    },
    [onChangeSelected, selected, selectedIds],
  );

  const removeOption = useCallback(
    (id: string) => {
      onChangeSelected(selected.filter(item => item.id !== id));
    },
    [onChangeSelected, selected],
  );

  const submitQuery = useCallback(() => {
    if (!trimmed || creating) return;
    if (exactMatch) {
      if (!selectedIds.has(exactMatch.id)) {
        addOption(exactMatch);
      } else {
        setQuery('');
      }
      return;
    }
    onRequestCreate(trimmed);
  }, [
    trimmed,
    creating,
    exactMatch,
    selectedIds,
    addOption,
    onRequestCreate,
  ]);

  return (
    <View style={styles.suggestBlock}>
      <Text style={[styles.sectionLabel, { color: detail.label }]}>{label}</Text>
      {selected.length > 0 ? (
        <View style={styles.chipWrap}>
          {selected.map(item => (
            <Chip
              key={item.id}
              onClose={() => removeOption(item.id)}
              style={styles.chip}>
              {item.name}
            </Chip>
          ))}
        </View>
      ) : null}
      <TextInput
        mode="outlined"
        label={placeholder}
        value={query}
        onChangeText={setQuery}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Keep suggestions briefly so a press can register.
          setTimeout(() => setFocused(false), 150);
        }}
        onSubmitEditing={submitQuery}
        dense
        disabled={creating}
        right={
          trimmed ? (
            <TextInput.Icon
              icon="plus"
              disabled={creating}
              onPress={submitQuery}
            />
          ) : undefined
        }
      />
      {focused && trimmed ? (
        <View
          style={[
            styles.suggestList,
            {
              backgroundColor: detail.surface,
              borderColor: detail.border,
            },
          ]}>
          {suggestions.map(opt => (
            <Pressable
              key={opt.id}
              onPress={() => addOption(opt)}
              style={styles.suggestRow}>
              <Text style={{ color: theme.colors.onSurface }}>{opt.name}</Text>
            </Pressable>
          ))}
          {showCreateHint ? (
            <Pressable
              onPress={submitQuery}
              style={[styles.suggestRow, styles.suggestCreateRow]}>
              <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>
                Create “{trimmed}”
              </Text>
            </Pressable>
          ) : null}
          {!showCreateHint && suggestions.length === 0 ? (
            <Text
              style={[
                styles.suggestEmpty,
                { color: theme.colors.onSurfaceVariant },
              ]}>
              Already selected
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
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
  const [selectedPublicCats, setSelectedPublicCats] = useState<
    ProductNamedOption[]
  >([]);
  const [selectedTags, setSelectedTags] = useState<ProductNamedOption[]>([]);
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
  const [pendingCreate, setPendingCreate] = useState<PendingCreate | null>(null);
  const [creatingMeta, setCreatingMeta] = useState(false);

  useEffect(() => {
    if (!session?.token) return;
    let cancelled = false;
    setMetaLoading(true);
    void Promise.all([
      fetchProductCategories(session.token),
      fetchPublicCategories(session.token),
      fetchProductTags(session.token),
      fetchNextWebsiteSequence(session.token).catch(() => 1),
    ])
      .then(([cats, pubCats, productTags, nextSequence]) => {
        if (cancelled) return;
        setCategories(cats);
        setPublicCategories(pubCats);
        setTags(productTags);
        setWebsiteSequence(
          Number(nextSequence).toLocaleString('en-US', {
            maximumFractionDigits: 0,
          }),
        );
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

  const confirmCreateMeta = useCallback(async () => {
    if (!session?.token || !pendingCreate) return;
    setCreatingMeta(true);
    setError('');
    try {
      if (pendingCreate.kind === 'tag') {
        const created = await createProductTag(
          session.token,
          pendingCreate.name,
        );
        setTags(prev =>
          prev.some(t => t.id === created.id) ? prev : [...prev, created],
        );
        setSelectedTags(prev =>
          prev.some(t => t.id === created.id) ? prev : [...prev, created],
        );
      } else {
        const created = await createPublicCategory(
          session.token,
          pendingCreate.name,
        );
        setPublicCategories(prev =>
          prev.some(c => c.id === created.id) ? prev : [...prev, created],
        );
        setSelectedPublicCats(prev =>
          prev.some(c => c.id === created.id) ? prev : [...prev, created],
        );
      }
      setPendingCreate(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : pendingCreate.kind === 'tag'
            ? 'Failed to create tag.'
            : 'Failed to create category.',
      );
    } finally {
      setCreatingMeta(false);
    }
  }, [session?.token, pendingCreate]);

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
      publicCategoryIds: selectedPublicCats.map(c => c.id),
      tagIds: selectedTags.map(t => t.id),
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
    selectedPublicCats,
    selectedTags,
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
                disabled
              />

              <SuggestCreateField
                label="Categories"
                placeholder="Type eCommerce category"
                options={publicCategories}
                selected={selectedPublicCats}
                onChangeSelected={setSelectedPublicCats}
                creating={creatingMeta}
                onRequestCreate={nameToCreate =>
                  setPendingCreate({ kind: 'category', name: nameToCreate })
                }
              />

              <SuggestCreateField
                label="Tags"
                placeholder="Type product tag"
                options={tags}
                selected={selectedTags}
                onChangeSelected={setSelectedTags}
                creating={creatingMeta}
                onRequestCreate={nameToCreate =>
                  setPendingCreate({ kind: 'tag', name: nameToCreate })
                }
              />

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
              disabled={saving || creatingMeta}>
              Save
            </Button>
          </View>
        </View>
      </ScrollView>

      <Portal>
        <Dialog
          visible={Boolean(pendingCreate)}
          onDismiss={() => {
            if (!creatingMeta) setPendingCreate(null);
          }}>
          <Dialog.Title>
            {pendingCreate?.kind === 'tag'
              ? 'Create new tag?'
              : 'Create new category?'}
          </Dialog.Title>
          <Dialog.Content>
            <Text>
              “{pendingCreate?.name}” was not found. Create it in Odoo and add it
              to this product?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setPendingCreate(null)}
              disabled={creatingMeta}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={creatingMeta}
              disabled={creatingMeta}
              onPress={() => void confirmCreateMeta()}>
              Create
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  suggestBlock: {
    gap: 8,
    marginTop: 4,
    zIndex: 2,
  },
  suggestList: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: 'hidden',
  },
  suggestRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestCreateRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  suggestEmpty: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
});
