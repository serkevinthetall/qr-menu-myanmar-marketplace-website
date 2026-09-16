import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  RadioButton,
  Text,
  useTheme,
} from 'react-native-paper';

import { PaymentMethod } from '@/types/quotation';

type PayableInvoiceInfo = {
  id: string;
  name: string;
  amountResidual: number;
  currency: string;
};

type Props = {
  visible: boolean;
  orderLabel?: string;
  payableInvoice?: PayableInvoiceInfo | null;
  paymentMethods: PaymentMethod[];
  methodsLoading: boolean;
  paying: boolean;
  preferredMethodId?: string;
  onDismiss: () => void;
  onConfirm: (paymentMethodLineId: string) => void;
};

function formatAmount(amount: number, currency?: string): string {
  const value = Number.isFinite(amount)
    ? amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })
    : '0';
  return currency ? `${currency} ${value}` : value;
}

export function PayInvoiceDialog({
  visible,
  orderLabel,
  payableInvoice,
  paymentMethods,
  methodsLoading,
  paying,
  preferredMethodId,
  onDismiss,
  onConfirm,
}: Props) {
  const theme = useTheme();
  const muted = theme.colors.onSurfaceVariant;
  const [selectedMethodId, setSelectedMethodId] = useState('');

  useEffect(() => {
    if (!visible) {
      return;
    }
    const preferred =
      preferredMethodId &&
      paymentMethods.some(method => method.id === preferredMethodId)
        ? preferredMethodId
        : paymentMethods[0]?.id || '';
    setSelectedMethodId(preferred);
  }, [visible, preferredMethodId, paymentMethods]);

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={paying ? undefined : onDismiss}
        style={styles.dialog}>
        <Dialog.Title>
          {orderLabel ? `Pay · ${orderLabel}` : 'Register payment'}
        </Dialog.Title>
        <Dialog.Content>
          {payableInvoice ? (
            <View style={styles.meta}>
              <Text variant="bodyMedium">{payableInvoice.name}</Text>
              <Text variant="titleMedium" style={styles.amount}>
                {formatAmount(
                  payableInvoice.amountResidual,
                  payableInvoice.currency,
                )}
              </Text>
            </View>
          ) : (
            <Text style={{ color: muted }}>No unpaid invoice loaded.</Text>
          )}

          <Text style={[styles.sectionLabel, { color: muted }]}>
            Payment method
          </Text>

          {methodsLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator />
            </View>
          ) : paymentMethods.length === 0 ? (
            <Text style={{ color: muted }}>
              No inbound payment methods found in Odoo.
            </Text>
          ) : (
            <RadioButton.Group
              onValueChange={setSelectedMethodId}
              value={selectedMethodId}>
              {paymentMethods.map(method => (
                <View key={method.id} style={styles.methodRow}>
                  <RadioButton.Android value={method.id} />
                  <Text
                    style={styles.methodLabel}
                    onPress={() => setSelectedMethodId(method.id)}>
                    {method.name}
                  </Text>
                </View>
              ))}
            </RadioButton.Group>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button disabled={paying} onPress={onDismiss}>
            Cancel
          </Button>
          <Button
            mode="contained"
            loading={paying}
            disabled={
              paying ||
              methodsLoading ||
              !selectedMethodId ||
              !payableInvoice
            }
            onPress={() => onConfirm(selectedMethodId)}>
            Pay
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxWidth: 520,
    alignSelf: 'center',
    width: '94%',
  },
  meta: {
    gap: 4,
    marginBottom: 16,
  },
  amount: {
    fontWeight: '700',
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  centered: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  methodLabel: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
});
