import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';

import { DeliveryPreview } from '@/types/delivery';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';

type Props = {
  visible: boolean;
  orderLabel?: string;
  deliveries: DeliveryPreview[];
  loading: boolean;
  error: string;
  validating: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
};

function formatQty(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function statusColors(state: string, isDark: boolean) {
  switch (state) {
    case 'assigned':
      return isDark
        ? { bg: 'rgba(59, 130, 246, 0.25)', fg: '#93C5FD' }
        : { bg: '#DBEAFE', fg: '#1E40AF' };
    case 'done':
      return isDark
        ? { bg: 'rgba(16, 185, 129, 0.22)', fg: '#6EE7B7' }
        : { bg: '#DCFCE7', fg: '#166534' };
    case 'cancel':
      return isDark
        ? { bg: 'rgba(239, 68, 68, 0.22)', fg: '#FCA5A5' }
        : { bg: '#FEE2E2', fg: '#991B1B' };
    case 'waiting':
    case 'confirmed':
      return isDark
        ? { bg: 'rgba(245, 158, 11, 0.22)', fg: '#FCD34D' }
        : { bg: '#FEF3C7', fg: '#92400E' };
    default:
      return isDark
        ? { bg: '#334155', fg: '#CBD5E1' }
        : { bg: '#E2E8F0', fg: '#475569' };
  }
}

export function DeliveryValidatePreview({
  visible,
  orderLabel,
  deliveries,
  loading,
  error,
  validating,
  onDismiss,
  onConfirm,
}: Props) {
  const theme = useTheme();
  const isDark = theme.dark;
  const canValidate = useMemo(
    () => deliveries.some(d => d.canValidate),
    [deliveries],
  );
  const borderColor = theme.colors.outlineVariant ?? theme.colors.outline;
  const muted = theme.colors.onSurfaceVariant;

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={validating ? undefined : onDismiss}
        style={styles.dialog}>
        <Dialog.Title>
          {orderLabel ? `Delivery · ${orderLabel}` : 'Validate delivery'}
        </Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView>
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator />
                <Text style={[styles.hint, { color: muted }]}>
                  Loading delivery…
                </Text>
              </View>
            ) : error ? (
              <Text style={{ color: theme.colors.error }}>{error}</Text>
            ) : deliveries.length === 0 ? (
              <Text style={{ color: muted }}>
                No outgoing delivery found for this order.
              </Text>
            ) : (
              deliveries.map(picking => {
                const colors = statusColors(picking.state, isDark);
                return (
                  <View
                    key={picking.id}
                    style={[styles.picking, { borderColor }]}>
                    <View style={styles.pickingHeader}>
                      <Text variant="titleMedium" style={styles.pickingName}>
                        {picking.name}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: colors.bg },
                        ]}>
                        <Text
                          style={[styles.badgeText, { color: colors.fg }]}>
                          {picking.stateLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: muted }]}>
                          Scheduled Date
                        </Text>
                        <Text variant="bodyMedium">
                          {formatMyanmarDateTime(picking.scheduledDate, {
                            empty: '—',
                          }) || '—'}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: muted }]}>
                          Effective Date
                        </Text>
                        <Text variant="bodyMedium">
                          {formatMyanmarDateTime(picking.effectiveDate, {
                            empty: '—',
                          }) || '—'}
                        </Text>
                      </View>
                    </View>

                    {picking.partner ? (
                      <Text
                        style={[styles.partner, { color: muted }]}
                        numberOfLines={1}>
                        {picking.partner}
                      </Text>
                    ) : null}

                    <View
                      style={[
                        styles.tableHeader,
                        { borderBottomColor: borderColor },
                      ]}>
                      <Text
                        style={[styles.colProduct, styles.th, { color: muted }]}>
                        Product
                      </Text>
                      <Text
                        style={[styles.colQty, styles.th, { color: muted }]}>
                        Demand
                      </Text>
                      <Text
                        style={[styles.colQty, styles.th, { color: muted }]}>
                        Quantity
                      </Text>
                      <Text
                        style={[styles.colUnit, styles.th, { color: muted }]}>
                        Unit
                      </Text>
                    </View>

                    {picking.lines.length === 0 ? (
                      <Text style={[styles.emptyLines, { color: muted }]}>
                        No move lines.
                      </Text>
                    ) : (
                      picking.lines.map(line => (
                        <View
                          key={line.id}
                          style={[
                            styles.tableRow,
                            { borderBottomColor: borderColor },
                          ]}>
                          <Text style={styles.colProduct} numberOfLines={2}>
                            {line.product}
                          </Text>
                          <Text style={styles.colQty}>
                            {formatQty(line.demand)}
                          </Text>
                          <Text style={styles.colQty}>
                            {formatQty(line.quantity)}
                          </Text>
                          <Text style={styles.colUnit} numberOfLines={1}>
                            {line.unit}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button disabled={validating} onPress={onDismiss}>
            Cancel
          </Button>
          <Button
            mode="contained"
            loading={validating}
            disabled={validating || loading || !!error || !canValidate}
            onPress={onConfirm}>
            Validate
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    maxWidth: 720,
    alignSelf: 'center',
    width: '94%',
  },
  scrollArea: {
    maxHeight: 420,
    paddingHorizontal: 0,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 10,
  },
  hint: {
    fontSize: 13,
  },
  picking: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  pickingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  pickingName: {
    flex: 1,
    fontWeight: '600',
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flex: 1,
    gap: 2,
  },
  metaLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  partner: {
    fontSize: 13,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  th: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  colProduct: {
    flex: 1.6,
    fontSize: 13,
  },
  colQty: {
    flex: 0.7,
    fontSize: 13,
    textAlign: 'right',
  },
  colUnit: {
    flex: 0.7,
    fontSize: 13,
  },
  emptyLines: {
    paddingVertical: 10,
    fontSize: 13,
  },
});
