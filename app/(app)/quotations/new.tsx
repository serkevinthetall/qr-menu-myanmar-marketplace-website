import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
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

import {
  AppSearchBar,
  AppSearchViewToggle,
} from '@/components/app/AppSearchBar';
import { useAuth } from '@/contexts/auth-context';
import { DropdownField } from '@/components/ui/DropdownField';
import {
  AppContact,
  AppContactAddress,
  fetchAppContactAddresses,
  fetchAppContacts,
} from '@/services/app/contacts';
import { AppProduct } from '@/services/app/products';
import {
  ensureAppProductCatalog,
  filterAppProducts,
  subscribeAppProductCatalog,
} from '@/services/app/product-catalog-cache';
import {
  createAppQuotation,
  fetchAppPaymentMethods,
} from '@/services/app/quotations';

const SALE_PERSON_OPTIONS = [
  'Me Me',
  'Htet Htet',
  'Thiri',
  'Myo Min Khant',
  'Zay Yar Htet',
  'Zaw Htet Naing',
  'Mya Mya Thin',
] as const;

type CartLine = { product: AppProduct; qty: number };
type Step = 'customer' | 'location' | 'products' | 'confirm';

const STEPS: { key: Step; short: string }[] = [
  { key: 'customer', short: 'Customer' },
  { key: 'location', short: 'Location' },
  { key: 'products', short: 'Products' },
  { key: 'confirm', short: 'Confirm' },
];

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function addressLines(address: AppContactAddress): string {
  return [address.street, address.street2, address.township, address.city]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(', ');
}

export default function AppNewQuotationScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
  }>();
  const prefillApplied = useRef(false);

  const [step, setStep] = useState<Step>('customer');
  const [error, setError] = useState('');

  const [contactQuery, setContactQuery] = useState('');
  const [contacts, setContacts] = useState<AppContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [customer, setCustomer] = useState<AppContact | null>(null);

  const [addresses, setAddresses] = useState<AppContactAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [shippingPartnerId, setShippingPartnerId] = useState('');

  const [productQuery, setProductQuery] = useState('');
  const [catalogProducts, setCatalogProducts] = useState<AppProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);

  const [salePersonName, setSalePersonName] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [paymentMethodLineId, setPaymentMethodLineId] = useState('');
  const [preferredDeliveryDate, setPreferredDeliveryDate] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [orderExpanded, setOrderExpanded] = useState(false);
  const [productView, setProductView] = useState<'list' | 'grid'>('list');

  const selectedAddress = useMemo(
    () => addresses.find(item => item.id === shippingPartnerId) ?? null,
    [addresses, shippingPartnerId],
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.product.price * line.qty, 0),
    [cart],
  );

  const cartQty = useMemo(
    () => cart.reduce((sum, line) => sum + line.qty, 0),
    [cart],
  );

  const loadAddresses = useCallback(
    async (contact: AppContact) => {
      if (!session?.token) return;
      setLoadingAddresses(true);
      setAddresses([]);
      setShippingPartnerId('');
      try {
        const result = await fetchAppContactAddresses(session.token, contact.id);
        const list = result.addresses?.length
          ? result.addresses
          : [
              {
                id: contact.id,
                name: contact.name,
                phone: contact.phone,
                street: '',
                street2: '',
                city: contact.city,
                township: contact.township,
                isMain: true,
                label: contact.name,
              },
            ];
        setAddresses(list);
        const preferred =
          list.find(item => item.id === result.defaultAddressId)?.id ??
          list[0]?.id ??
          contact.id;
        setShippingPartnerId(preferred);
      } catch {
        setAddresses([
          {
            id: contact.id,
            name: contact.name,
            phone: contact.phone,
            street: '',
            street2: '',
            city: contact.city,
            township: contact.township,
            isMain: true,
            label: contact.name,
          },
        ]);
        setShippingPartnerId(contact.id);
      } finally {
        setLoadingAddresses(false);
      }
    },
    [session?.token],
  );

  const selectCustomer = useCallback(
    async (item: AppContact) => {
      setCustomer(item);
      setError('');
      setCart([]);
      setStep('location');
      await loadAddresses(item);
    },
    [loadAddresses],
  );

  useEffect(() => {
    if (prefillApplied.current || !params.customerId || !session?.token) return;
    prefillApplied.current = true;
    void selectCustomer({
      id: String(params.customerId),
      name: String(params.customerName ?? 'Customer'),
      phone: String(params.customerPhone ?? ''),
      email: '',
      city: '',
      township: '',
      company: '',
      isCompany: false,
    });
  }, [params.customerId, params.customerName, params.customerPhone, session?.token, selectCustomer]);

  useEffect(() => {
    if (!session?.token) return;
    void fetchAppPaymentMethods(session.token)
      .then(setPaymentMethods)
      .catch(() => setPaymentMethods([]));
  }, [session?.token]);

  useEffect(() => {
    if (step !== 'customer' || !session?.token) return;
    const timer = setTimeout(() => {
      setLoadingContacts(true);
      void fetchAppContacts(session.token, {
        q: contactQuery.trim() || undefined,
        limit: 50,
      })
        .then(setContacts)
        .catch(err =>
          setError(err instanceof Error ? err.message : 'Failed to load contacts.'),
        )
        .finally(() => setLoadingContacts(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [step, session?.token, contactQuery]);

  useEffect(() => {
    if (step !== 'products' || !session?.token) return;
    setLoadingProducts(true);
    const unsub = subscribeAppProductCatalog(snapshot => {
      setCatalogProducts(snapshot.products);
      if (snapshot.products.length > 0 || snapshot.complete) {
        setLoadingProducts(false);
      }
    });
    void ensureAppProductCatalog(session.token)
      .catch(err =>
        setError(err instanceof Error ? err.message : 'Failed to load products.'),
      )
      .finally(() => setLoadingProducts(false));
    return unsub;
  }, [step, session?.token]);

  const products = useMemo(
    () => filterAppProducts(catalogProducts, { q: productQuery }),
    [catalogProducts, productQuery],
  );

  const setQty = (product: AppProduct, qty: number) => {
    setCart(prev => {
      const nextQty = Math.max(0, qty);
      if (nextQty === 0) {
        return prev.filter(line => line.product.id !== product.id);
      }
      const existing = prev.find(line => line.product.id === product.id);
      if (existing) {
        return prev.map(line =>
          line.product.id === product.id ? { ...line, qty: nextQty } : line,
        );
      }
      return [...prev, { product, qty: nextQty }];
    });
  };

  const qtyFor = (productId: string) =>
    cart.find(line => line.product.id === productId)?.qty ?? 0;

  const canGo = (target: Step) => {
    if (target === 'customer') return true;
    if (target === 'location') return !!customer;
    if (target === 'products') return !!customer && !!shippingPartnerId;
    if (target === 'confirm') return !!customer && !!shippingPartnerId && cart.length > 0;
    return false;
  };

  const handleSave = useCallback(async () => {
    if (!session?.token || !customer) return;
    setError('');
    if (!shippingPartnerId) {
      setError('Pick a delivery location.');
      setStep('location');
      return;
    }
    if (cart.length === 0) {
      setError('Add at least one product.');
      setStep('products');
      return;
    }
    if (!salePersonName.trim()) {
      setError('Sale person is required.');
      return;
    }
    if (!paymentMethodLineId) {
      setError('Payment method is required.');
      return;
    }
    if (!preferredDeliveryDate.trim()) {
      setError('Delivery date is required (YYYY-MM-DD).');
      return;
    }
    if (!deliveryNote.trim()) {
      setError('Delivery notes are required.');
      return;
    }

    setSaving(true);
    try {
      const created = await createAppQuotation(session.token, {
        customerId: customer.id,
        shippingPartnerId,
        salePersonName: salePersonName.trim(),
        deliveryNote: deliveryNote.trim(),
        preferredDeliveryDate: preferredDeliveryDate.trim(),
        phoneNumber: customer.phone,
        paymentMethodLineId,
        lines: cart.map(line => ({
          productId: line.product.id,
          quantity: line.qty,
          unitPrice: line.product.price,
          discountPercent: 0,
        })),
      });

      Alert.alert('Saved', `Quotation ${created.number} created.`, [
        {
          text: 'Open',
          onPress: () => router.replace(`/(app)/quotations/${created.id}`),
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save quotation.');
    } finally {
      setSaving(false);
    }
  }, [
    session?.token,
    customer,
    shippingPartnerId,
    salePersonName,
    paymentMethodLineId,
    preferredDeliveryDate,
    deliveryNote,
    cart,
    router,
  ]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Compact progress — equal columns, no text wrapping */}
      <View style={styles.steps}>
        {STEPS.map((item, index) => {
          const active = step === item.key;
          const enabled = canGo(item.key);
          const done =
            (item.key === 'customer' && !!customer) ||
            (item.key === 'location' && !!shippingPartnerId) ||
            (item.key === 'products' && cart.length > 0) ||
            (item.key === 'confirm' && false);
          return (
            <Pressable
              key={item.key}
              disabled={!enabled}
              onPress={() => enabled && setStep(item.key)}
              style={[styles.stepItem, { opacity: enabled ? 1 : 0.4 }]}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor: active
                      ? theme.colors.primary
                      : done
                        ? theme.colors.primaryContainer
                        : theme.colors.surfaceVariant,
                  },
                ]}>
                <Text
                  style={{
                    color: active
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant,
                    fontWeight: '800',
                    fontSize: 12,
                  }}>
                  {index + 1}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                style={[
                  styles.stepLabel,
                  {
                    color: active
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant,
                    fontWeight: active ? '700' : '500',
                  },
                ]}>
                {item.short}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Sticky context bar once customer is known */}
      {customer && step !== 'customer' ? (
        <View
          style={[
            styles.contextBar,
            {
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.outline,
            },
          ]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.contextName} numberOfLines={1}>
              {customer.name}
            </Text>
            <Text
              style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}
              numberOfLines={2}>
              {selectedAddress
                ? addressLines(selectedAddress) || selectedAddress.label
                : 'Pick delivery location'}
            </Text>
          </View>
          <Button
            compact
            mode="text"
            onPress={() => setStep(step === 'location' ? 'customer' : 'location')}>
            Change
          </Button>
        </View>
      ) : null}

      {error ? (
        <HelperText type="error" visible style={{ marginHorizontal: 8 }}>
          {error}
        </HelperText>
      ) : null}

      {/* STEP 1 — Customer */}
      {step === 'customer' ? (
        <View style={styles.flex}>
          <Text style={styles.hint}>Search and tap a customer</Text>
          <View style={styles.searchWrap}>
            <AppSearchBar
              placeholder="Name or phone"
              value={contactQuery}
              onChangeText={setContactQuery}
            />
          </View>          {loadingContacts ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.empty}>No customers found.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => void selectCustomer(item)}
                  style={[
                    styles.bigCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                    },
                  ]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant }}>
                      {item.phone || 'No phone'}
                    </Text>
                    {item.township || item.city ? (
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 4,
                          fontSize: 12,
                        }}>
                        {[item.township, item.city].filter(Boolean).join(', ')}
                      </Text>
                    ) : null}
                  </View>
                  <Icon source="chevron-right" size={24} color={theme.colors.primary} />
                </Pressable>
              )}
            />
          )}
        </View>
      ) : null}

      {/* STEP 2 — Delivery location */}
      {step === 'location' ? (
        <View style={styles.flex}>
          <Text style={styles.hint}>Where should we deliver?</Text>
          {loadingAddresses ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={addresses}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <Text style={styles.empty}>No delivery locations for this customer.</Text>
              }
              renderItem={({ item }) => {
                const selected = shippingPartnerId === item.id;
                const detail = addressLines(item);
                return (
                  <Pressable
                    onPress={() => setShippingPartnerId(item.id)}
                    style={[
                      styles.locationCard,
                      {
                        backgroundColor: selected
                          ? theme.colors.primaryContainer
                          : theme.colors.surface,
                        borderColor: selected
                          ? theme.colors.primary
                          : theme.colors.outline,
                      },
                    ]}>
                    <View style={styles.locationTop}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.isMain ? 'Main location' : item.name}
                      </Text>
                      {selected ? (
                        <Icon source="check-circle" size={22} color={theme.colors.primary} />
                      ) : null}
                    </View>
                    {detail ? (
                      <Text style={{ color: theme.colors.onSurface, marginTop: 4 }}>
                        {detail}
                      </Text>
                    ) : (
                      <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                        No street on file
                      </Text>
                    )}
                    {item.phone ? (
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 4,
                          fontSize: 12,
                        }}>
                        {item.phone}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          )}
          <Button
            mode="contained"
            disabled={!shippingPartnerId || loadingAddresses}
            onPress={() => setStep('products')}
            style={styles.footerBtn}
            contentStyle={styles.footerBtnContent}>
            Continue to products
          </Button>
        </View>
      ) : null}

      {/* STEP 3 — Add products + expandable order details */}
      {step === 'products' ? (
        <View style={styles.flex}>
          <Text style={styles.hint}>Tap a product to add it</Text>
          <View style={styles.searchWrap}>
            <AppSearchBar
              placeholder="Search product or SKU"
              value={productQuery}
              onChangeText={setProductQuery}
              right={
                <AppSearchViewToggle
                  mode={productView}
                  onChange={setProductView}
                />
              }
            />
          </View>          {loadingProducts ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              key={productView}
              data={products}
              keyExtractor={item => item.id}
              numColumns={productView === 'grid' ? 2 : 1}
              columnWrapperStyle={
                productView === 'grid' ? styles.gridRow : undefined
              }
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.empty}>No products found.</Text>
              }
              renderItem={({ item }) => {
                const qty = qtyFor(item.id);
                const selected = qty > 0;
                if (productView === 'grid') {
                  return (
                    <Pressable
                      onPress={() => setQty(item, qty + 1)}
                      style={[
                        styles.gridCard,
                        {
                          backgroundColor: selected
                            ? theme.colors.primaryContainer
                            : theme.colors.surface,
                          borderColor: selected
                            ? theme.colors.primary
                            : theme.colors.outline,
                        },
                      ]}>
                      <Text style={styles.cardTitle} numberOfLines={3}>
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 6,
                          fontSize: 12,
                        }}
                        numberOfLines={1}>
                        {item.sku || '—'}
                      </Text>
                      <Text style={{ fontWeight: '800', marginTop: 8 }}>
                        {formatMoney(item.price)} MMK
                      </Text>
                      {selected ? (
                        <View style={[styles.qtyRow, { marginTop: 8, alignSelf: 'center' }]}>
                          <IconButton
                            icon="minus"
                            mode="contained-tonal"
                            size={16}
                            onPress={() => setQty(item, qty - 1)}
                          />
                          <Text style={styles.qtyValue}>{qty}</Text>
                          <IconButton
                            icon="plus"
                            mode="contained-tonal"
                            size={16}
                            onPress={() => setQty(item, qty + 1)}
                          />
                        </View>
                      ) : (
                        <View style={{ marginTop: 8, alignSelf: 'center' }}>
                          <Icon
                            source="plus-circle"
                            size={26}
                            color={theme.colors.primary}
                          />
                        </View>
                      )}
                    </Pressable>
                  );
                }

                return (
                  <Pressable
                    onPress={() => setQty(item, qty + 1)}
                    style={[
                      styles.bigCard,
                      {
                        backgroundColor: selected
                          ? theme.colors.primaryContainer
                          : theme.colors.surface,
                        borderColor: selected
                          ? theme.colors.primary
                          : theme.colors.outline,
                      },
                    ]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {item.name}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 4,
                        }}>
                        {formatMoney(item.price)} MMK
                        {item.sku ? ` · ${item.sku}` : ''}
                      </Text>
                    </View>
                    {selected ? (
                      <View style={styles.qtyRow}>
                        <IconButton
                          icon="minus"
                          mode="contained-tonal"
                          size={18}
                          onPress={() => setQty(item, qty - 1)}
                        />
                        <Text style={styles.qtyValue}>{qty}</Text>
                        <IconButton
                          icon="plus"
                          mode="contained-tonal"
                          size={18}
                          onPress={() => setQty(item, qty + 1)}
                        />
                      </View>
                    ) : (
                      <Icon source="plus-circle" size={28} color={theme.colors.primary} />
                    )}
                  </Pressable>
                );
              }}
            />
          )}

          <View
            style={[
              styles.orderSheet,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.outline,
              },
            ]}>
            <Pressable
              onPress={() => setOrderExpanded(prev => !prev)}
              style={styles.orderToggle}
              accessibilityRole="button"
              accessibilityLabel={
                orderExpanded ? 'Hide order details' : 'Show order details'
              }>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.orderToggleTitle}>Order details</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                  {cart.length === 0
                    ? 'No products yet'
                    : `${cart.length} product${cart.length === 1 ? '' : 's'} · ${cartQty} qty · ${formatMoney(cartTotal)} MMK`}
                </Text>
              </View>
              <Icon
                source={orderExpanded ? 'chevron-up' : 'chevron-down'}
                size={26}
                color={theme.colors.onSurfaceVariant}
              />
            </Pressable>

            {orderExpanded ? (
              cart.length === 0 ? (
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    paddingHorizontal: 16,
                    paddingBottom: 12,
                  }}>
                  Add products above. Details will show here.
                </Text>
              ) : (
                <ScrollView
                  style={styles.orderExpandedList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled>
                  {cart.map(line => {
                    const lineTotal = line.product.price * line.qty;
                    return (
                      <View
                        key={line.product.id}
                        style={[
                          styles.orderLine,
                          {
                            borderBottomColor:
                              theme.colors.outlineVariant ?? theme.colors.outline,
                          },
                        ]}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.orderLineName} numberOfLines={2}>
                            {line.product.name}
                          </Text>
                          <Text
                            style={{
                              color: theme.colors.onSurfaceVariant,
                              fontSize: 12,
                              marginTop: 2,
                            }}>
                            {[line.product.sku, line.product.unit]
                              .filter(Boolean)
                              .join(' · ') || 'Product'}
                          </Text>
                          <Text style={{ marginTop: 4, fontSize: 13 }}>
                            {formatMoney(line.product.price)} × {line.qty} ={' '}
                            <Text style={{ fontWeight: '700' }}>
                              {formatMoney(lineTotal)} MMK
                            </Text>
                          </Text>
                        </View>
                        <View style={styles.qtyRow}>
                          <IconButton
                            icon="minus"
                            mode="contained-tonal"
                            size={16}
                            onPress={() => setQty(line.product, line.qty - 1)}
                          />
                          <Text style={styles.qtyValue}>{line.qty}</Text>
                          <IconButton
                            icon="plus"
                            mode="contained-tonal"
                            size={16}
                            onPress={() => setQty(line.product, line.qty + 1)}
                          />
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )
            ) : null}

            <View
              style={[
                styles.cartFooter,
                {
                  borderTopColor:
                    theme.colors.outlineVariant ?? theme.colors.outline,
                },
              ]}>
              <View>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>
                  TOTAL
                </Text>
                <Text style={styles.totalValue}>{formatMoney(cartTotal)} MMK</Text>
              </View>
              <Button
                mode="contained"
                disabled={cart.length === 0}
                onPress={() => setStep('confirm')}
                contentStyle={{ paddingHorizontal: 12 }}>
                Next
              </Button>
            </View>
          </View>
        </View>
      ) : null}

      {/* STEP 4 — Review & save */}
      {step === 'confirm' ? (
        <ScrollView
          contentContainerStyle={styles.confirm}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Products ordered</Text>
          {cart.map(line => (
            <View
              key={line.product.id}
              style={[
                styles.reviewLine,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {line.product.name}
                </Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                  {line.qty} × {formatMoney(line.product.price)} MMK
                </Text>
              </View>
              <Text style={styles.lineAmount}>
                {formatMoney(line.product.price * line.qty)}
              </Text>
            </View>
          ))}
          <View style={styles.reviewTotalRow}>
            <Text style={styles.reviewTotalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatMoney(cartTotal)} MMK</Text>
          </View>
          <Button
            mode="outlined"
            icon="pencil"
            onPress={() => setStep('products')}
            style={{ marginBottom: 16 }}>
            Edit products
          </Button>

          <DropdownField
            label="Sale person *"
            value={salePersonName}
            options={[...SALE_PERSON_OPTIONS]}
            onChange={setSalePersonName}
            placeholder="Select sale person"
            showClearOption={false}
            sortOptions={false}
          />

          <View style={{ height: 12 }} />

          <DropdownField
            label="Payment *"
            value={
              paymentMethods.find(method => method.id === paymentMethodLineId)
                ?.name ?? ''
            }
            options={paymentMethods.map(method => method.name)}
            onChange={name => {
              const match = paymentMethods.find(method => method.name === name);
              setPaymentMethodLineId(match?.id ?? '');
            }}
            placeholder="Select payment method"
            showClearOption={false}
            sortOptions={false}
          />

          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Delivery *</Text>
          <TextInput
            mode="outlined"
            label="Date (YYYY-MM-DD)"
            value={preferredDeliveryDate}
            onChangeText={setPreferredDeliveryDate}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Notes"
            value={deliveryNote}
            onChangeText={setDeliveryNote}
            multiline
            style={styles.input}
          />

          <Button
            mode="contained"
            loading={saving}
            disabled={saving}
            onPress={() => void handleSave()}
            style={styles.footerBtn}
            contentStyle={styles.footerBtnContent}>
            Save quotation
          </Button>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  steps: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 11,
    width: '100%',
    textAlign: 'center',
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contextName: { fontWeight: '800', fontSize: 15 },
  hint: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
    fontSize: 14,
  },
  searchWrap: { paddingHorizontal: 12, marginTop: 6 },
  list: { padding: 12, paddingBottom: 110 },
  gridRow: { gap: 10 },
  gridCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    minHeight: 140,
  },
  bigCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationCard: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  locationTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: { fontWeight: '700', fontSize: 15 },
  qtyRow: { flexDirection: 'row', alignItems: 'center' },
  qtyValue: {
    minWidth: 28,
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 16,
  },
  cartFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  orderSheet: {
    borderTopWidth: 1,
  },
  orderToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  orderToggleTitle: { fontWeight: '800', fontSize: 15 },
  orderExpandedList: {
    maxHeight: 220,
  },
  orderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  orderLineName: { fontWeight: '700', fontSize: 14 },
  totalValue: { fontWeight: '800', fontSize: 18 },
  footerBtn: { marginTop: 8, marginBottom: 12 },
  footerBtnContent: { paddingVertical: 6 },
  confirm: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 10,
  },
  reviewLine: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lineAmount: { fontWeight: '800', fontSize: 15 },
  reviewTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  reviewTotalLabel: { fontWeight: '700', fontSize: 16 },
  input: { marginBottom: 10 },
  empty: { textAlign: 'center', marginTop: 40, opacity: 0.6 },
});
