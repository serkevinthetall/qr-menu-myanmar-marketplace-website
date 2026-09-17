import {
  fetchAppQuotationInvoices,
} from '@/services/app/quotations';
import {
  fetchOnlineOrderInvoices,
} from '@/services/online-orders';
import {
  fetchQuotationInvoices,
} from '@/services/quotations';
import {
  fetchSaleOrderInvoices,
} from '@/services/sale-orders';
import { InvoicePreview } from '@/types/invoice';
import { InvoiceOrderSource } from '@/utils/order-invoice-nav';

export async function fetchOrderInvoices(
  token: string,
  source: InvoiceOrderSource,
  orderId: string,
): Promise<InvoicePreview[]> {
  if (source === 'online-orders') {
    return fetchOnlineOrderInvoices(token, orderId);
  }
  if (source === 'quotations') {
    return fetchQuotationInvoices(token, orderId);
  }
  if (source === 'app-quotations') {
    return fetchAppQuotationInvoices(token, orderId);
  }
  return fetchSaleOrderInvoices(token, orderId);
}
