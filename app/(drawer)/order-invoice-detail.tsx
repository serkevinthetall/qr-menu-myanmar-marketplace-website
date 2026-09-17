import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { InvoiceDetailView } from '@/components/invoice/InvoiceDetailView';
import { useAuth } from '@/contexts/auth-context';
import { useDetailHeader, useModuleSearch } from '@/contexts/search-context';
import { fetchOrderInvoices } from '@/services/order-invoices';
import { InvoicePreview } from '@/types/invoice';
import {
  firstParam,
  parseInvoiceOrderSource,
} from '@/utils/order-invoice-nav';

export default function OrderInvoiceDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    source?: string;
    orderId?: string;
    orderNumber?: string;
    invoiceId?: string;
  }>();

  const source = parseInvoiceOrderSource(params.source);
  const orderId = firstParam(params.orderId);
  const orderNumber = firstParam(params.orderNumber);
  const invoiceId = firstParam(params.invoiceId);

  const [invoice, setInvoice] = useState<InvoicePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useModuleSearch('', false);

  const load = useCallback(async () => {
    if (!session?.token || !orderId || !invoiceId) {
      setError('Missing invoice.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchOrderInvoices(session.token, source, orderId);
      const found = data.find(row => row.id === invoiceId) ?? null;
      setInvoice(found);
      if (!found) {
        setError('Invoice not found for this order.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load invoice.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token, source, orderId, invoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const header = useMemo(
    () => ({
      title: invoice?.name || 'Invoice',
      onBack: () => routerRef.current.back(),
      breadcrumbParent: orderNumber || 'Invoices',
    }),
    [invoice?.name, orderNumber],
  );

  useDetailHeader(header);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InvoiceDetailView invoice={invoice} loading={loading} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
