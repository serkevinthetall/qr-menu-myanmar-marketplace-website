import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { InvoiceListView } from '@/components/invoice/InvoiceListView';
import { useAuth } from '@/contexts/auth-context';
import { useDetailHeader, useModuleSearch } from '@/contexts/search-context';
import { fetchOrderInvoices } from '@/services/order-invoices';
import { InvoicePreview } from '@/types/invoice';
import {
  firstParam,
  navigateBackToOrderDetail,
  parseInvoiceOrderSource,
  pushOrderInvoiceDetail,
} from '@/utils/order-invoice-nav';

export default function OrderInvoicesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    source?: string;
    orderId?: string;
    orderNumber?: string;
  }>();

  const source = parseInvoiceOrderSource(params.source);
  const orderId = firstParam(params.orderId);
  const orderNumber = firstParam(params.orderNumber);

  const [items, setItems] = useState<InvoicePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useModuleSearch('', false);

  const load = useCallback(async () => {
    if (!session?.token || !orderId) {
      setError('Missing order.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchOrderInvoices(session.token, source, orderId);
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load invoices.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token, source, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onBack = useCallback(() => {
    navigateBackToOrderDetail(routerRef.current, { source, orderId });
  }, [source, orderId]);

  const header = useMemo(
    () => ({
      title: orderNumber ? `Invoices · ${orderNumber}` : 'Invoices',
      onBack,
      breadcrumbParent:
        source === 'online-orders'
          ? 'App Order'
          : source === 'quotations' || source === 'app-quotations'
            ? 'Orders'
            : 'Sale Order',
    }),
    [orderNumber, source, onBack],
  );

  useDetailHeader(header);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InvoiceListView
        invoices={items}
        loading={loading}
        error={error}
        onOpen={invoiceId => {
          pushOrderInvoiceDetail(routerRef.current, {
            source,
            orderId,
            invoiceId,
            orderNumber,
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
