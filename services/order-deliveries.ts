import {
  fetchAppQuotationDeliveries,
  validateAppQuotationDelivery,
} from '@/services/app/quotations';
import {
  fetchOnlineOrderDeliveries,
  validateOnlineOrderDelivery,
} from '@/services/online-orders';
import {
  fetchQuotationDeliveries,
  validateQuotationDelivery,
} from '@/services/quotations';
import {
  fetchSaleOrderDeliveries,
  validateSaleOrderDelivery,
} from '@/services/sale-orders';
import { DeliveryPreview } from '@/types/delivery';
import { DeliveryOrderSource } from '@/utils/order-delivery-nav';

export async function fetchOrderDeliveries(
  token: string,
  source: DeliveryOrderSource,
  orderId: string,
): Promise<DeliveryPreview[]> {
  if (source === 'online-orders') {
    return fetchOnlineOrderDeliveries(token, orderId);
  }
  if (source === 'quotations') {
    return fetchQuotationDeliveries(token, orderId);
  }
  if (source === 'app-quotations') {
    return fetchAppQuotationDeliveries(token, orderId);
  }
  return fetchSaleOrderDeliveries(token, orderId);
}

export async function validateOrderDelivery(
  token: string,
  source: DeliveryOrderSource,
  orderId: string,
  pickingId?: string,
): Promise<void> {
  if (source === 'online-orders') {
    await validateOnlineOrderDelivery(token, orderId, pickingId);
    return;
  }
  if (source === 'quotations') {
    await validateQuotationDelivery(token, orderId, pickingId);
    return;
  }
  if (source === 'app-quotations') {
    await validateAppQuotationDelivery(token, orderId, pickingId);
    return;
  }
  await validateSaleOrderDelivery(token, orderId, pickingId);
}
