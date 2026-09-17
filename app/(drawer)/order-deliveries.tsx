import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from 'react-native-paper';

import { DeliveryListView } from '@/components/delivery/DeliveryListView';
import { useAuth } from '@/contexts/auth-context';
import { useDetailHeader, useModuleSearch } from '@/contexts/search-context';
import { fetchOrderDeliveries } from '@/services/order-deliveries';
import { DeliveryPreview } from '@/types/delivery';
import {
  firstParam,
  parseDeliveryOrderSource,
  pushOrderDeliveryDetail,
} from '@/utils/order-delivery-nav';

export default function OrderDeliveriesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    source?: string;
    orderId?: string;
    orderNumber?: string;
  }>();

  const source = parseDeliveryOrderSource(params.source);
  const orderId = firstParam(params.orderId);
  const orderNumber = firstParam(params.orderNumber);

  const [items, setItems] = useState<DeliveryPreview[]>([]);
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
      const data = await fetchOrderDeliveries(session.token, source, orderId);
      setItems(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load deliveries.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token, source, orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  useDetailHeader({
    title: orderNumber ? `Deliveries · ${orderNumber}` : 'Deliveries',
    onBack: () => router.back(),
    breadcrumbParent:
      source === 'online-orders'
        ? 'App Order'
        : source === 'quotations' || source === 'app-quotations'
          ? 'Orders'
          : 'Sale Order',
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DeliveryListView
        deliveries={items}
        loading={loading}
        error={error}
        onOpen={pickingId => {
          pushOrderDeliveryDetail(router, {
            source,
            orderId,
            pickingId,
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
