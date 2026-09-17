import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  FAB,
  IconButton,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';

import { QuotationDetailView } from '@/components/quotation/QuotationDetailView';
import { QuotationPrintPreview } from '@/components/quotation/QuotationPrintPreview';
import { DeliveryValidatePreview } from '@/components/delivery/DeliveryValidatePreview';
import { PayInvoiceDialog } from '@/components/delivery/PayInvoiceDialog';
import {
  canCancelQuotation,
  canConfirmQuotation,
  canCreateInvoice,
  canPayInvoice,
  canValidateDelivery,
} from '@/constants/status-colors';
import { useAuth } from '@/contexts/auth-context';
import {
  cancelAppQuotation,
  confirmAppQuotation,
  createAppQuotationInvoice,
  fetchAppPaymentMethods,
  fetchAppQuotationDetail,
  fetchAppQuotationDeliveries,
  payAppQuotationInvoice,
  validateAppQuotationDelivery,
} from '@/services/app/quotations';
import { DeliveryPreview } from '@/types/delivery';
import { PaymentMethod, QuotationDetail } from '@/types/quotation';

export default function AppQuotationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const navigation = useNavigation();
  const { session } = useAuth();
  const router = useRouter();
  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printPromptVisible, setPrintPromptVisible] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmConfirmVisible, setConfirmConfirmVisible] = useState(false);
  const [validatingDelivery, setValidatingDelivery] = useState(false);
  const [validateDeliveryVisible, setValidateDeliveryVisible] = useState(false);
  const [deliveryPreviews, setDeliveryPreviews] = useState<DeliveryPreview[]>([]);
  const [deliveryPreviewLoading, setDeliveryPreviewLoading] = useState(false);
  const [deliveryPreviewError, setDeliveryPreviewError] = useState('');
  const [creatingInvoice, setCreatingInvoice] = useState(false);
  const [createInvoiceVisible, setCreateInvoiceVisible] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(false);
  const [payInvoiceVisible, setPayInvoiceVisible] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!session?.token || !id) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchAppQuotationDetail(session.token, id);
      setDetail(data);
    } catch (err) {
      setDetail(null);
      setError(err instanceof Error ? err.message : 'Failed to load quotation.');
    } finally {
      setLoading(false);
    }
  }, [session?.token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = useCallback(async () => {
    if (!session?.token || !id) return;
    setCancelling(true);
    try {
      const updated = await cancelAppQuotation(session.token, id);
      setDetail(updated);
      setCancelConfirmVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel quotation.');
    } finally {
      setCancelling(false);
    }
  }, [session?.token, id]);

  const handleConfirm = useCallback(async () => {
    if (!session?.token || !id) return;
    setConfirming(true);
    try {
      const updated = await confirmAppQuotation(session.token, id);
      setDetail(updated);
      setConfirmConfirmVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm quotation.');
    } finally {
      setConfirming(false);
    }
  }, [session?.token, id]);

  const openValidateDelivery = useCallback(async () => {
    if (!session?.token || !id) return;
    setValidateDeliveryVisible(true);
    setDeliveryPreviewLoading(true);
    setDeliveryPreviewError('');
    setDeliveryPreviews([]);
    try {
      const data = await fetchAppQuotationDeliveries(session.token, id);
      setDeliveryPreviews(data);
    } catch (err) {
      setDeliveryPreviewError(
        err instanceof Error ? err.message : 'Failed to load delivery preview.',
      );
    } finally {
      setDeliveryPreviewLoading(false);
    }
  }, [session?.token, id]);

  const handleValidateDelivery = useCallback(async () => {
    if (!session?.token || !id) return;
    setValidatingDelivery(true);
    try {
      const updated = await validateAppQuotationDelivery(session.token, id);
      setDetail(updated);
      setValidateDeliveryVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate delivery.');
    } finally {
      setValidatingDelivery(false);
    }
  }, [session?.token, id]);

  const handleCreateInvoice = useCallback(async () => {
    if (!session?.token || !id) return;
    setCreatingInvoice(true);
    try {
      const updated = await createAppQuotationInvoice(session.token, id);
      setDetail(updated);
      setCreateInvoiceVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice.');
    } finally {
      setCreatingInvoice(false);
    }
  }, [session?.token, id]);

  const openPayInvoice = useCallback(async () => {
    if (!session?.token) return;
    setPayInvoiceVisible(true);
    setPaymentMethodsLoading(true);
    try {
      const methods = await fetchAppPaymentMethods(session.token);
      setPaymentMethods(methods);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load payment methods.',
      );
    } finally {
      setPaymentMethodsLoading(false);
    }
  }, [session?.token]);

  const handlePayInvoice = useCallback(
    async (paymentMethodLineId: string) => {
      if (!session?.token || !id) return;
      setPayingInvoice(true);
      try {
        const updated = await payAppQuotationInvoice(
          session.token,
          id,
          paymentMethodLineId,
        );
        setDetail(updated);
        setPayInvoiceVisible(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to register payment.',
        );
      } finally {
        setPayingInvoice(false);
      }
    },
    [session?.token, id],
  );

  useLayoutEffect(() => {
    const showCancel = detail ? canCancelQuotation(detail.status) : false;
    const showConfirm = detail ? canConfirmQuotation(detail.status) : false;
    const showValidate = detail ? canValidateDelivery(detail) : false;
    const showInvoice = detail ? canCreateInvoice(detail) : false;
    const showPay = detail ? canPayInvoice(detail) : false;
    const deliveryCount = detail?.deliveryCount ?? 0;
    const showDelivery = deliveryCount > 0;
    navigation.setOptions({
      headerRight:
        showCancel ||
        showConfirm ||
        showValidate ||
        showDelivery ||
        showInvoice ||
        showPay
          ? () => (
              <View style={styles.headerActions}>
                {showConfirm ? (
                  <IconButton
                    icon="check-circle-outline"
                    iconColor={theme.colors.onPrimary}
                    disabled={
                      confirming ||
                      cancelling ||
                      validatingDelivery ||
                      creatingInvoice ||
                      payingInvoice
                    }
                    onPress={() => setConfirmConfirmVisible(true)}
                    accessibilityLabel="Confirm quotation"
                  />
                ) : null}
                {showValidate ? (
                  <IconButton
                    icon="truck-check-outline"
                    iconColor={theme.colors.onPrimary}
                    disabled={
                      validatingDelivery ||
                      confirming ||
                      cancelling ||
                      creatingInvoice ||
                      payingInvoice
                    }
                    onPress={() => {
                      void openValidateDelivery();
                    }}
                    accessibilityLabel="Validate delivery"
                  />
                ) : null}
                {showDelivery ? (
                  <IconButton
                    icon="truck-delivery-outline"
                    iconColor={theme.colors.onPrimary}
                    onPress={() => {
                      void openValidateDelivery();
                    }}
                    accessibilityLabel={`${deliveryCount} Delivery`}
                  />
                ) : null}
                {showInvoice ? (
                  <IconButton
                    icon="file-document-outline"
                    iconColor={theme.colors.onPrimary}
                    disabled={
                      creatingInvoice ||
                      validatingDelivery ||
                      confirming ||
                      cancelling ||
                      payingInvoice
                    }
                    onPress={() => setCreateInvoiceVisible(true)}
                    accessibilityLabel="Create invoice"
                  />
                ) : null}
                {showPay ? (
                  <IconButton
                    icon="cash-check"
                    iconColor={theme.colors.onPrimary}
                    disabled={
                      payingInvoice ||
                      creatingInvoice ||
                      validatingDelivery ||
                      confirming ||
                      cancelling
                    }
                    onPress={() => {
                      void openPayInvoice();
                    }}
                    accessibilityLabel="Pay invoice"
                  />
                ) : null}
                {showCancel ? (
                  <IconButton
                    icon="cancel"
                    iconColor={theme.colors.onPrimary}
                    disabled={
                      cancelling ||
                      confirming ||
                      validatingDelivery ||
                      creatingInvoice ||
                      payingInvoice
                    }
                    onPress={() => setCancelConfirmVisible(true)}
                    accessibilityLabel="Cancel quotation"
                  />
                ) : null}
              </View>
            )
          : undefined,
    });
  }, [
    navigation,
    detail,
    cancelling,
    confirming,
    validatingDelivery,
    creatingInvoice,
    payingInvoice,
    theme.colors.onPrimary,
    openValidateDelivery,
    openPayInvoice,
  ]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <QuotationDetailView
        detail={detail}
        loading={loading}
        error={error}
        onBack={() => router.back()}
        contentBottomInset={88}
        onOpenDelivery={
          (detail?.deliveryCount ?? 0) > 0
            ? () => {
                void openValidateDelivery();
              }
            : undefined
        }
      />

      <Portal>
        <Dialog
          visible={printPromptVisible}
          onDismiss={() => setPrintPromptVisible(false)}>
          <Dialog.Title>Print quotation?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Do you want to print quotation {detail?.number ?? ''} on thermal
              paper?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPrintPromptVisible(false)}>No</Button>
            <Button
              mode="contained"
              onPress={() => {
                setPrintPromptVisible(false);
                setShowPrintPreview(true);
              }}>
              Yes
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={cancelConfirmVisible}
          onDismiss={() => (cancelling ? undefined : setCancelConfirmVisible(false))}>
          <Dialog.Title>Cancel quotation?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Cancel {detail?.number ?? 'this quotation'}? This cannot be undone
              from here.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={cancelling}
              onPress={() => setCancelConfirmVisible(false)}>
              Keep
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              loading={cancelling}
              disabled={cancelling}
              onPress={() => {
                void handleCancel();
              }}>
              Cancel quotation
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={confirmConfirmVisible}
          onDismiss={() =>
            confirming ? undefined : setConfirmConfirmVisible(false)
          }>
          <Dialog.Title>Confirm quotation?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Confirm {detail?.number ?? 'this quotation'} as a sales order in
              Odoo?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={confirming}
              onPress={() => setConfirmConfirmVisible(false)}>
              Keep
            </Button>
            <Button
              mode="contained"
              loading={confirming}
              disabled={confirming}
              onPress={() => {
                void handleConfirm();
              }}>
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>

        <DeliveryValidatePreview
          visible={validateDeliveryVisible}
          orderLabel={detail?.number}
          deliveries={deliveryPreviews}
          loading={deliveryPreviewLoading}
          error={deliveryPreviewError}
          validating={validatingDelivery}
          onDismiss={() => setValidateDeliveryVisible(false)}
          onConfirm={() => {
            void handleValidateDelivery();
          }}
        />

        <Dialog
          visible={createInvoiceVisible}
          onDismiss={() =>
            creatingInvoice ? undefined : setCreateInvoiceVisible(false)
          }>
          <Dialog.Title>Create invoice?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Create a customer invoice in Odoo for{' '}
              {detail?.number ?? 'this order'}?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={creatingInvoice}
              onPress={() => setCreateInvoiceVisible(false)}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={creatingInvoice}
              disabled={creatingInvoice}
              onPress={() => {
                void handleCreateInvoice();
              }}>
              Create Invoice
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <PayInvoiceDialog
        visible={payInvoiceVisible}
        orderLabel={detail?.number}
        payableInvoice={detail?.payableInvoice}
        paymentMethods={paymentMethods}
        methodsLoading={paymentMethodsLoading}
        paying={payingInvoice}
        preferredMethodId={detail?.paymentMethodLineId}
        onDismiss={() => setPayInvoiceVisible(false)}
        onConfirm={methodId => {
          void handlePayInvoice(methodId);
        }}
      />

      {showPrintPreview && detail ? (
        <QuotationPrintPreview
          detail={detail}
          format="thermal"
          onClose={() => setShowPrintPreview(false)}
        />
      ) : null}

      {detail && !loading && !error ? (
        <FAB
          icon="printer-pos"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => setPrintPromptVisible(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
  },
});
