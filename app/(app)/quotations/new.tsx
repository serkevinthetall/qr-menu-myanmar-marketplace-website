import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Searchbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { useAuth } from '@/contexts/auth-context';
import { AppContact, fetchAppContacts } from '@/services/app/contacts';
import { AppProduct, fetchAppProducts } from '@/services/app/products';
import {
  createAppQuotation,
  fetchAppPaymentMethods,
} from '@/services/app/quotations';
import { fetchCustomerAddresses } from '@/services/customers';

const SALE_PERSON_OPTIONS = [
  'Me Me',
  'Htet Htet',
  'Thiri',
  'Myo Min Khant',
  'Zay Yar Htet',
  'Zaw Htet Naing',
  'Mya Mya Thin',
] as const;

type CartLine = {
  product: AppProduct;
  qty: number;
};

type Step = 'contact' | 'products' | 'details';

export default function AppNewQuotationScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('contact');
  const [contactQuery, setContactQuery] = useState('');
  const [contacts, setContacts] = useState<AppContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [customer, setCustomer] = useState<AppContact | null>(null);
  const [shippingPartnerId, setShippingPartnerId] = useState('');

  const [productQuery, setProductQuery] = useState('');
  const [products, setProducts] = useState<AppProduct[]>([]);
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
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session?.token) return;
    void fetchAppPaymentMethods(session.token)
      .then(setPaymentMethods)
      .catch(() => setPaymentMethods([]));
  }, [session?.token]);

  useEffect(() => {
    if (step !== 'contact' || !session?.token) return;
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
    const timer = setTimeout(() => {
      setLoadingProducts(true);
      void fetchAppProducts(session.token, {
        q: productQuery.trim() || undefined,
        limit: 50,
      })
        .then(result => setProducts(result.products))
        .catch(err =>
          setError(err instanceof Error ? err.message : 'Failed to load products.'),
        )
        .finally(() => setLoadingProducts(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [step, session?.token, productQuery]);

  const selectCustomer = async (item: AppContact) => {
    if (!session?.token) return;
    setCustomer(item);
    setError('');
    try {
      const addresses = await fetchCustomerAddresses(session.token, item.id);
      setShippingPartnerId(addresses.defaultAddressId || item.id);
    } catch {
      setShippingPartnerId(item.id);
    }
    setStep('products');
  };

  const addProduct = (product: AppProduct) => {
    setCart(prev => {
      const existing = prev.find(line => line.product.id === product.id);
      if (existing) {
        return prev.map(line =>
          line.product.id === product.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.product.price * line.qty, 0),
    [cart],
  );

  const handleSave = useCallback(async () => {
    if (!session?.token || !customer) return;
    setError('');
    if (!salePersonName.trim()) {
      setError('Sale person name is required.');
      return;
    }
    if (!paymentMethodLineId) {
      setError('Payment method is required.');
      return;
    }
    if (!preferredDeliveryDate.trim()) {
      setError('Preferred delivery date is required (YYYY-MM-DD).');
      return;
    }
    if (!deliveryNote.trim()) {
      setError('Delivery notes are required.');
      return;
    }
    if (!shippingPartnerId) {
      setError('Delivery location is required.');
      return;
    }
    if (cart.length === 0) {
      setError('Add at least one product.');
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
    salePersonName,
    paymentMethodLineId,
    preferredDeliveryDate,
    deliveryNote,
    shippingPartnerId,
    cart,
    router,
  ]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.steps}>
        {(['contact', 'products', 'details'] as Step[]).map(item => (
          <Pressable
            key={item}
            onPress={() => {
              if (item === 'products' && !customer) return;
              if (item === 'details' && cart.length === 0) return;
              setStep(item);
            }}
            style={[
              styles.step,
              {
                backgroundColor:
                  step === item ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
              },
            ]}>
            <Text style={{ fontWeight: step === item ? '700' : '500', fontSize: 12 }}>
              {item.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <HelperText type="error" visible>
          {error}
        </HelperText>
      ) : null}

      {step === 'contact' ? (
        <View style={styles.flex}>
          <Searchbar
            placeholder="Search contact"
            value={contactQuery}
            onChangeText={setContactQuery}
            style={styles.search}
          />
          {loadingContacts ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={contacts}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => void selectCustomer(item)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                    },
                  ]}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text>{item.phone || '—'}</Text>
                </Pressable>
              )}
            />
          )}
        </View>
      ) : null}

      {step === 'products' ? (
        <View style={styles.flex}>
          <Text style={styles.banner}>
            {customer?.name} · Cart {cart.reduce((s, l) => s + l.qty, 0)} ·{' '}
            {cartTotal.toLocaleString()} MMK
          </Text>
          <Searchbar
            placeholder="Search products"
            value={productQuery}
            onChangeText={setProductQuery}
            style={styles.search}
          />
          {loadingProducts ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={products}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => addProduct(item)}
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                    },
                  ]}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text>
                    {item.price.toLocaleString()} MMK · tap to add
                  </Text>
                </Pressable>
              )}
            />
          )}
          <Button
            mode="contained"
            disabled={cart.length === 0}
            onPress={() => setStep('details')}
            style={styles.nextBtn}>
            Continue ({cart.length} products)
          </Button>
        </View>
      ) : null}

      {step === 'details' ? (
        <ScrollView contentContainerStyle={styles.details}>
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            {customer?.name}
          </Text>
          <Text style={{ marginBottom: 12 }}>
            Lines: {cart.length} · Total {cartTotal.toLocaleString()} MMK
          </Text>

          <Text style={styles.label}>Sale person *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SALE_PERSON_OPTIONS.map(name => (
              <Button
                key={name}
                mode={salePersonName === name ? 'contained' : 'outlined'}
                compact
                onPress={() => setSalePersonName(name)}
                style={{ marginRight: 6, marginBottom: 8 }}>
                {name}
              </Button>
            ))}
          </ScrollView>

          <Text style={styles.label}>Payment method *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {paymentMethods.map(method => (
              <Button
                key={method.id}
                mode={paymentMethodLineId === method.id ? 'contained' : 'outlined'}
                compact
                onPress={() => setPaymentMethodLineId(method.id)}
                style={{ marginRight: 6, marginBottom: 8 }}>
                {method.name}
              </Button>
            ))}
          </ScrollView>

          <TextInput
            mode="outlined"
            label="Preferred delivery date * (YYYY-MM-DD)"
            value={preferredDeliveryDate}
            onChangeText={setPreferredDeliveryDate}
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Delivery notes *"
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
            style={styles.nextBtn}>
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
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  search: { marginHorizontal: 12, marginTop: 8 },
  list: { padding: 12, paddingBottom: 100 },
  card: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  cardTitle: { fontWeight: '700', marginBottom: 2 },
  banner: {
    marginHorizontal: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  nextBtn: { margin: 12 },
  details: { padding: 16, paddingBottom: 40 },
  label: { fontWeight: '700', marginTop: 8, marginBottom: 6 },
  input: { marginBottom: 10 },
});
