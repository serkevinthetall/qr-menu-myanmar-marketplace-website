import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Dialog,
  Portal,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';

import { DeliveryDetailView } from '@/components/delivery/DeliveryDetailView';
import { useAuth } from '@/contexts/auth-context';
import { useDetailHeader, useModuleSearch } from '@/contexts/search-context';
import {
  fetchOrderDeliveries,
  validateOrderDelivery,
} from '@/services/order-deliveries';
import { DeliveryPreview } from '@/types/delivery';
import {
  firstParam,
  parseDeliveryOrderSource,
} from '@/utils/order-delivery-nav';

export default function OrderDeliveryDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const { session } = useAuth();
  const params = useLocalSearchParams<{
    source?: string;
    orderId?: string;
    orderNumber?: string;
    pickingId?: string;
  }>();

  const source = parseDeliveryOrderSource(params.source);
  const orderId = firstParam(params.orderId);
  const orderNumber = firstParam(params.orderNumber);
  const pickingId = firstParam(params.pickingId);

  const [delivery, setDelivery] = useState<DeliveryPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [snackbar, setSnackbar] = useState('');

  useModuleSearch('', false);

  const load = useCallback(async () => {
    if (!session?.token || !orderId || !pickingId) {
      setError('Missing delivery.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await fetchOrderDeliveries(session.token, source, orderId);
      const found = data.find(row => row.id === pickingId) ?? null;
      setDelivery(found);
      if (!found) {
        setError('Delivery not found for this order.');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load delivery.',
      );
    } finally {
      setLoading(false);
    }
  }, [session?.token, source, orderId, pickingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleValidate = useCallback(async () => {
    if (!session?.token || !orderId || !pickingId) {
      return;
    }
    setValidating(true);
    setConfirmVisible(false);
    try {
      await validateOrderDelivery(session.token, source, orderId, pickingId);
      setSnackbar('Delivery validated.');
      await load();
    } catch (err) {
      setSnackbar(
        err instanceof Error ? err.message : 'Failed to validate delivery.',
      );
    } finally {
      setValidating(false);
    }
  }, [session?.token, source, orderId, pickingId, load]);

  const canValidate = Boolean(delivery?.canValidate);

  const header = useMemo(
    () => ({
      title: delivery?.name || 'Delivery',
      onBack: () => routerRef.current.back(),
      breadcrumbParent: orderNumber || 'Deliveries',
      onValidateDelivery: canValidate
        ? () => setConfirmVisible(true)
        : undefined,
      validatingDelivery: validating,
    }),
    [delivery?.name, orderNumber, canValidate, validating],
  );

  useDetailHeader(header);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <DeliveryDetailView delivery={delivery} loading={loading} error={error} />

      <Portal>
        <Dialog
          visible={confirmVisible}
          onDismiss={() => (validating ? undefined : setConfirmVisible(false))}>
          <Dialog.Title>Validate delivery?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Validate {delivery?.name ?? 'this delivery'}
              {orderNumber ? ` for ${orderNumber}` : ''}?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={validating}
              onPress={() => setConfirmVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={validating}
              disabled={validating}
              onPress={() => {
                void handleValidate();
              }}>
              Validate
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={!!snackbar}
        onDismiss={() => setSnackbar('')}
        duration={3000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
