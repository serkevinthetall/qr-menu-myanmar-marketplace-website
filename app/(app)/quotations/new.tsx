import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  HelperText,
  Icon,
  IconButton,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppSearchBar,
  AppSearchViewToggle,
  appSearchWrapStyle,
} from '@/components/app/AppSearchBar';
import { QuotationPrintPreview } from '@/components/quotation/QuotationPrintPreview';
import { useAuth } from '@/contexts/auth-context';
import { CustomerNameText } from '@/components/ui/CustomerNameText';
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
  fetchAppQuotationDetail,
} from '@/services/app/quotations';
import { QuotationDetail } from '@/types/quotation';

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
  const insets = useSafeAreaInsets();
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
  const [printDetail, setPrintDetail] = useState<QuotationDetail | null>(null);
  const [loadingPrint, setLoadingPrint] = useState(false);
  const [printPrompt, setPrintPrompt] = useState<{
    id: string;
    number: string;
  } | null>(null);
  const savedQuoteIdRef = useRef<string | null>(null);

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

  const goToSavedQuote = useCallback(() => {
    const id = savedQuoteIdRef.current;
    if (id) {
      router.replace(`/(app)/quotations/${id}`);
      return;
    }
    router.replace('/(app)/quotations');
  }, [router]);

  const openThermalPrintPreview = useCallback(
    async (quotationId: string) => {
      if (!session?.token) return;
      setLoadingPrint(true);
      setError('');
      try {
        const detail = await fetchAppQuotationDetail(session.token, quotationId);
        setPrintDetail(detail);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Saved, but could not open print preview.',
        );
        goToSavedQuote();
      } finally {
        setLoadingPrint(false);
      }
    },
    [session?.token, goToSavedQuote],
  );

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

      savedQuoteIdRef.current = created.id;
      setPrintPrompt({ id: created.id, number: created.number });
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
  ]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Portal>
        <Dialog
          visible={!!printPrompt}
          dismissable={false}
          onDismiss={() => undefined}>
          <Dialog.Title>Print quotation?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Quotation {printPrompt?.number} was saved successfully. Do you want
              to print this quotation on thermal paper?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setPrintPrompt(null);
                goToSavedQuote();
              }}>
              No
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                const id = printPrompt?.id;
                setPrintPrompt(null);
                if (id) {
                  void openThermalPrintPreview(id);
                }
              }}>
              Yes
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {loadingPrint ? (
        <View style={styles.printLoading}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Preparing thermal preview…
          </Text>
        </View>
      ) : null}

      {printDetail ? (
        <QuotationPrintPreview
          detail={printDetail}
          format="thermal"
          onClose={() => {
            setPrintDetail(null);
            goToSavedQuote();
          }}
        />
      ) : null}

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
            <CustomerNameText size="title" style={styles.contextName}>
              {customer.name}
            </CustomerNameText>
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                fontSize: 12,
                lineHeight: 20,
                paddingBottom: 2,
              }}>
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
          <View style={appSearchWrapStyle}>
            <AppSearchBar
              placeholder="Name or phone"
              value={contactQuery}
              onChangeText={setContactQuery}
            />
          </View>
          {loadingContacts ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              style={styles.flex}
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
                  <View style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
                    <CustomerNameText size="title" style={{ fontWeight: '700' }}>
                      {item.name}
                    </CustomerNameText>
                    <Text
                      style={{
                        color: theme.colors.onSurfaceVariant,
                        lineHeight: 22,
                        paddingBottom: 2,
                      }}>
                      {item.phone || 'No phone'}
                    </Text>
                    {item.township || item.city ? (
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 4,
                          fontSize: 12,
                          lineHeight: 20,
                          paddingBottom: 2,
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
              style={styles.flex}
              data={addresses}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
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
          <View
            style={[
              styles.stickyFooter,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.outline,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}>
            <View style={styles.footerRow}>
              <Button
                mode="outlined"
                onPress={() => setStep('customer')}
                style={styles.footerHalf}
                contentStyle={styles.footerBtnContent}>
                Back
              </Button>
              <Button
                mode="contained"
                disabled={!shippingPartnerId || loadingAddresses}
                onPress={() => setStep('products')}
                style={styles.footerHalf}
                contentStyle={styles.footerBtnContent}>
                Continue
              </Button>
            </View>
          </View>
        </View>
      ) : null}

      {/* STEP 3 — Add products + expandable order details */}
      {step === 'products' ? (
        <View style={styles.flex}>
          <Text style={styles.hint}>Tap a product to add it</Text>
          <View style={appSearchWrapStyle}>
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
          </View>
          {loadingProducts ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              style={styles.flex}
              key={productView}
              data={products}
              keyExtractor={item => item.id}
              numColumns={productView === 'grid' ? 2 : 1}
              columnWrapperStyle={
                productView === 'grid' ? styles.gridRow : undefined
              }
              contentContainerStyle={styles.listWithSheet}
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
                      <CustomerNameText
                        size="title"
                        style={styles.cardTitle}
                        numberOfLines={4}>
                        {item.name}
                      </CustomerNameText>
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 6,
                          fontSize: 12,
                          lineHeight: 18,
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
                    <View style={{ flex: 1, minWidth: 0, paddingBottom: 2 }}>
                      <CustomerNameText
                        size="title"
                        style={styles.cardTitle}
                        numberOfLines={3}>
                        {item.name}
                      </CustomerNameText>
                      <Text
                        style={{
                          color: theme.colors.onSurfaceVariant,
                          marginTop: 4,
                          lineHeight: 20,
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
              <View style={styles.footerRow}>
                <Button
                  mode="outlined"
                  onPress={() => setStep('location')}
                  contentStyle={{ paddingHorizontal: 8 }}>
                  Back
                </Button>
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
        </View>
      ) : null}

      {/* STEP 4 — Review & save */}
      {step === 'confirm' ? (
        <ScrollView
          contentContainerStyle={[
            styles.confirm,
            { paddingBottom: Math.max(insets.bottom, 24) + 16 },
          ]}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>Sale & payment</Text>
          <View style={styles.fieldBlock}>
            <DropdownField
              label="Sale person *"
              value={salePersonName}
              options={[...SALE_PERSON_OPTIONS]}
              onChange={setSalePersonName}
              placeholder="Select sale person"
              showClearOption={false}
              sortOptions={false}
            />
          </View>
          <View style={styles.fieldBlock}>
            <DropdownField
              label="Payment method *"
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
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Delivery *</Text>
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

          <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Products ordered</Text>
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
            style={{ marginBottom: 12 }}>
            Edit products
          </Button>

          <View style={styles.footerRow}>
            <Button
              mode="outlined"
              onPress={() => setStep('products')}
              style={styles.footerHalf}
              contentStyle={styles.footerBtnContent}>
              Back
            </Button>
            <Button
              mode="contained"
              loading={saving}
              disabled={saving}
              onPress={() => void handleSave()}
              style={styles.footerHalf}
              contentStyle={styles.footerBtnContent}>
              Save quotation
            </Button>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  printLoading: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 110,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
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
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contextName: { fontWeight: '800' },
  hint: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
    fontSize: 14,
  },
  list: { padding: 12, paddingBottom: 24 },
  listWithSheet: { padding: 12, paddingBottom: 16 },
  stickyFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  footerHalf: {
    flex: 1,
  },
  fieldBlock: { marginBottom: 14 },
  gridRow: { gap: 10 },
  gridCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    minHeight: 150,
    overflow: 'visible',
  },
  bigCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    overflow: 'visible',
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
  cardTitle: { fontWeight: '700' },
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
