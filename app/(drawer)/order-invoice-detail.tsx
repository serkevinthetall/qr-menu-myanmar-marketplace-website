import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { InvoiceDetailView } from '@/components/invoice/InvoiceDetailView';
import { DocumentPrintPreview } from '@/components/print/DocumentPrintPreview';
import { useAuth } from '@/contexts/auth-context';
import { useDetailHeader, useModuleSearch } from '@/contexts/search-context';
import { fetchOrderInvoices } from '@/services/order-invoices';
import { InvoicePreview } from '@/types/invoice';
import {
  firstParam,
  navigateBackToOrderInvoices,
  parseInvoiceOrderSource,
} from '@/utils/order-invoice-nav';
import { buildInvoicePrintHtml } from '@/utils/print-invoice';
import { PrintFormat } from '@/utils/print-quotation';

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
  const [printPreview, setPrintPreview] = useState<{
    format: PrintFormat;
    detail: InvoicePreview;
  } | null>(null);

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

  const printHtml = useMemo(
    () =>
      printPreview
        ? buildInvoicePrintHtml(printPreview.detail, printPreview.format)
        : '',
    [printPreview],
  );

  const header = useMemo(
    () => ({
      title: invoice?.name || 'Invoice',
      onBack: () =>
        navigateBackToOrderInvoices(routerRef.current, {
          source,
          orderId,
          orderNumber,
        }),
      breadcrumbParent: orderNumber || 'Invoices',
      onPrint: invoice
        ? (format: PrintFormat) => setPrintPreview({ format, detail: invoice })
        : undefined,
    }),
    [invoice, orderNumber, source, orderId],
  );

  useDetailHeader(header);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <InvoiceDetailView invoice={invoice} loading={loading} error={error} />

      {printPreview ? (
        <DocumentPrintPreview
          title={printPreview.detail.name}
          html={printHtml}
          format={printPreview.format}
          onClose={() => setPrintPreview(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
