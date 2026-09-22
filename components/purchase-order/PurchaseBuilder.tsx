import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  HelperText,
  Icon,
  IconButton,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { CreateContactView } from '@/components/contact/CreateContactView';
import { CalendarField } from '@/components/ui/CalendarField';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { SearchableDropdownField } from '@/components/ui/SearchableDropdownField';
import { useAuth } from '@/contexts/auth-context';
import { useResponsive } from '@/hooks/use-responsive';
import { fetchCustomersPage } from '@/services/customers';
import {
  createPurchaseOrder,
  CreatePurchaseOrderPayload,
} from '@/services/purchase-orders';
import {
  ensureWebProductCatalog,
  filterWebProducts,
  getWebProductCatalog,
  subscribeWebProductCatalog,
} from '@/services/web/product-catalog-cache';
import { Customer } from '@/types/customer';
import { Product } from '@/types/product';
import { PurchaseOrder } from '@/types/purchase-order';

type PurchaseLine = {
  key: string;
  product: Product;
  qty: number;
  unitPrice: number;
};

export type PurchaseBuilderProps = {
  onCancel: () => void;
  onCreated: (order: PurchaseOrder) => void;
};

function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toOdooDatetime(dateISO: string): string {
  if (!dateISO) return '';
  const now = new Date();
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${dateISO} ${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
}

function formatMoney(value: number): string {
  return `${(Number.isFinite(value) ? value : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

function lineKey(productId: string): string {
  return `${productId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * New Purchase RFQ form — mirrors Odoo Purchase “Requests for Quotation / New”.
 */
export function PurchaseBuilder({ onCancel, onCreated }: PurchaseBuilderProps) {
  const theme = useTheme();
  const { session } = useAuth();
  const { isDesktop } = useResponsive();

  const [vendors, setVendors] = useState<Customer[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendor, setVendor] = useState<Customer | null>(null);
  const [vendorRef, setVendorRef] = useState('');
  const [orderDeadline, setOrderDeadline] = useState(todayISO());
  const [expectedArrival, setExpectedArrival] = useState('');

  const [products, setProducts] = useState<Product[]>(
    () => getWebProductCatalog()?.products ?? [],
  );
  const [productsLoading, setProductsLoading] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [lines, setLines] = useState<PurchaseLine[]>([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [creatingVendor, setCreatingVendor] = useState(false);

  const reloadVendors = useCallback(async () => {
    if (!session?.token) return;
    setVendorsLoading(true);
    try {
      const page = await fetchCustomersPage(session.token, {
        limit: 200,
        offset: 0,
        lite: true,
        vendors: true,
      });
      setVendors(page.data);
    } catch {
      setError('Could not load vendors from Odoo.');
    } finally {
      setVendorsLoading(false);
    }
  }, [session?.token]);

  useEffect(() => {
    return subscribeWebProductCatalog(catalog => {
      setProducts(catalog.products);
    });
  }, []);

  useEffect(() => {
    void reloadVendors();
  }, [reloadVendors]);

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

  const vendorOptions = useMemo(
    () => vendors.map(v => v.name).filter(Boolean),
    [vendors],
  );

  const filteredProducts = useMemo(
    () => filterWebProducts(products, { q: productQuery }).slice(0, 40),
    [products, productQuery],
  );

  const untaxed = useMemo(
    () => lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0),
    [lines],
  );

  const pickVendor = useCallback(
    (name: string) => {
      const match = vendors.find(v => v.name === name) ?? null;
      setVendor(match);
    },
    [vendors],
  );

  const addProduct = useCallback((product: Product) => {
    setLines(prev => {
      const existing = prev.find(l => l.product.id === product.id);
      if (existing) {
        return prev.map(l =>
          l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          key: lineKey(product.id),
          product,
          qty: 1,
          unitPrice: Number(product.price) || 0,
        },
      ];
    });
    setProductQuery('');
  }, []);

  const updateLine = useCallback(
    (key: string, patch: Partial<Pick<PurchaseLine, 'qty' | 'unitPrice'>>) => {
      setLines(prev =>
        prev.map(line => (line.key === key ? { ...line, ...patch } : line)),
      );
    },
    [],
  );

  const removeLine = useCallback((key: string) => {
    setLines(prev => prev.filter(line => line.key !== key));
  }, []);

  const save = useCallback(
    async (confirm: boolean) => {
      if (!session?.token) return;
      if (!vendor) {
        setError('Select a vendor.');
        return;
      }
      if (lines.length === 0) {
        setError('Add at least one product.');
        return;
      }
      setSaving(true);
      setError('');
      try {
        const payload: CreatePurchaseOrderPayload = {
          partnerId: vendor.id,
          dateOrder: toOdooDatetime(orderDeadline),
          datePlanned: expectedArrival
            ? toOdooDatetime(expectedArrival)
            : undefined,
          partnerRef: vendorRef.trim() || undefined,
          confirm,
          lines: lines.map(line => ({
            productId: line.product.id,
            quantity: line.qty,
            unitPrice: line.unitPrice,
          })),
        };
        const created = await createPurchaseOrder(session.token, payload);
        onCreated({
          ...created,
          vendor: vendor.name,
          vendorId: vendor.id,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create purchase order.',
        );
      } finally {
        setSaving(false);
      }
    },
    [
      session?.token,
      vendor,
      lines,
      orderDeadline,
      expectedArrival,
      vendorRef,
      onCreated,
    ],
  );

  if (creatingVendor) {
    return (
      <CreateContactView
        embedded
        mode="vendor"
        onCancel={() => setCreatingVendor(false)}
        onCreated={created => {
          setVendor(created);
          setVendors(prev =>
            prev.some(v => v.id === created.id) ? prev : [created, ...prev],
          );
          setCreatingVendor(false);
          void reloadVendors();
        }}
      />
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <View style={styles.toolbarLeft}>
          <Button
            mode="contained"
            compact
            loading={saving}
            disabled={saving}
            onPress={() => void save(false)}
            icon="send">
            Save RFQ
          </Button>
          <Button
            mode="contained-tonal"
            compact
            loading={saving}
            disabled={saving}
            onPress={() => void save(true)}
            icon="check">
            Confirm Order
          </Button>
          <Button mode="text" compact disabled={saving} onPress={onCancel}>
            Cancel
          </Button>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: theme.colors.secondaryContainer },
          ]}>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSecondaryContainer, fontWeight: '700' }}>
            RFQ
          </Text>
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
          Requests for Quotation
        </Text>

        {error ? (
          <HelperText type="error" visible style={styles.error}>
            {error}
          </HelperText>
        ) : null}

        <View style={[styles.metaGrid, !isDesktop && styles.metaGridStack]}>
          <View style={styles.metaCol}>
            <Text variant="labelMedium" style={styles.fieldLabel}>
              Vendor
            </Text>
            {vendorsLoading ? (
              <ActivityIndicator style={{ marginVertical: 8 }} />
            ) : (
              <SearchableDropdownField
                value={vendor?.name ?? ''}
                options={vendorOptions}
                onChange={pickVendor}
                placeholder="Name, TIN, Email, or Reference"
              />
            )}
            <Button
              mode="outlined"
              compact
              icon="plus"
              onPress={() => setCreatingVendor(true)}
              style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              New Vendor
            </Button>
            <TextInput
              mode="outlined"
              dense
              label="Vendor Reference"
              value={vendorRef}
              onChangeText={setVendorRef}
              style={styles.field}
            />
          </View>
          <View style={styles.metaCol}>
            <CalendarField
              label="Order Deadline"
              value={orderDeadline}
              onChange={setOrderDeadline}
              placeholder="Select deadline"
            />
            <View style={{ height: 12 }} />
            <CalendarField
              label="Expected Arrival"
              value={expectedArrival}
              onChange={setExpectedArrival}
              placeholder="Optional"
            />
          </View>
        </View>

        <Text variant="titleMedium" style={styles.sectionTitle}>
          Products
        </Text>

        <View
          style={[
            styles.tableHeader,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}>
          <Text style={[styles.th, styles.colProduct]}>Product</Text>
          <Text style={[styles.th, styles.colQty]}>Quantity</Text>
          <Text style={[styles.th, styles.colPrice]}>Unit Price</Text>
          <Text style={[styles.th, styles.colAmount]}>Amount</Text>
          <View style={styles.colAction} />
        </View>

        {lines.map(line => (
          <View
            key={line.key}
            style={[
              styles.tableRow,
              { borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline },
            ]}>
            <View style={[styles.colProduct, styles.productCell]}>
              <ProductThumb productId={line.product.id} size={28} />
              <Text numberOfLines={2} style={styles.productName}>
                {line.product.name}
              </Text>
            </View>
            <TextInput
              mode="outlined"
              dense
              keyboardType="decimal-pad"
              value={String(line.qty)}
              onChangeText={text => {
                const n = Number(text);
                updateLine(line.key, { qty: Number.isFinite(n) && n > 0 ? n : 0 });
              }}
              style={styles.colQty}
            />
            <TextInput
              mode="outlined"
              dense
              keyboardType="decimal-pad"
              value={String(line.unitPrice)}
              onChangeText={text => {
                const n = Number(text);
                updateLine(line.key, {
                  unitPrice: Number.isFinite(n) && n >= 0 ? n : 0,
                });
              }}
              style={styles.colPrice}
            />
            <Text style={[styles.colAmount, styles.amountText]}>
              {formatMoney(line.qty * line.unitPrice)}
            </Text>
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
            placeholder="Add a product…"
            value={productQuery}
            onChangeText={setProductQuery}
            left={<TextInput.Icon icon="magnify" />}
            style={{ flex: 1 }}
          />
          {productsLoading ? <ActivityIndicator style={{ marginLeft: 8 }} /> : null}
        </View>

        {productQuery.trim() ? (
          <View
            style={[
              styles.productResults,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
              },
            ]}>
            {filteredProducts.length === 0 ? (
              <Text style={{ padding: 12, color: theme.colors.onSurfaceVariant }}>
                No matching products.
              </Text>
            ) : (
              <ScrollView
                style={styles.productResultsScroll}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator
                // Keep wheel/trackpad scroll on the results list (not the page) on web.
                {...(Platform.OS === 'web'
                  ? ({
                      onWheel: (e: { stopPropagation?: () => void }) => {
                        e.stopPropagation?.();
                      },
                    } as object)
                  : null)}>
                {filteredProducts.map(product => (
                  <Pressable
                    key={product.id}
                    onPress={() => addProduct(product)}
                    style={[
                      styles.productResultRow,
                      {
                        borderBottomColor:
                          theme.colors.outlineVariant ?? theme.colors.outline,
                      },
                    ]}>
                    <ProductThumb productId={product.id} size={28} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={{ fontWeight: '600' }}>
                        {product.name}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}>
                        {formatMoney(Number(product.price) || 0)}
                      </Text>
                    </View>
                    <Icon source="plus" size={18} color={theme.colors.primary} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}

        <View style={styles.totals}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Untaxed Amount
          </Text>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            {formatMoney(untaxed)}
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Total
          </Text>
          <Text variant="titleLarge" style={{ fontWeight: '800' }}>
            {formatMoney(untaxed)}
          </Text>
        </View>
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
    gap: 8,
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  title: { fontWeight: '700' },
  error: { marginBottom: 8 },
  metaGrid: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  metaGridStack: {
    flexDirection: 'column',
    gap: 12,
  },
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
  colQty: { width: 88 },
  colPrice: { width: 110 },
  colAmount: { width: 120, textAlign: 'right' },
  colAction: { width: 36 },
  productCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 6,
  },
  productName: { flex: 1, fontWeight: '600', fontSize: 13 },
  amountText: { fontWeight: '600', fontSize: 13 },
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
  productResultsScroll: {
    maxHeight: 280,
  },
  productResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totals: {
    marginTop: 24,
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
    gap: 4,
    minWidth: 200,
  },
});
