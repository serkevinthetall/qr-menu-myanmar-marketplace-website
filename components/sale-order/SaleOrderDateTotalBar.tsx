import { StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

type SaleOrderDateTotalBarProps = {
  dateLabel: string;
  orderCount: number;
  totalAmount: number;
  /** Singular noun, e.g. "order" or "quotation". */
  itemLabel?: string;
  /** Place under filters (above list) vs above pagination. */
  placement?: 'top' | 'bottom';
};

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

/** Filtered total amount for the active date/filter selection. */
export function SaleOrderDateTotalBar({
  dateLabel,
  orderCount,
  totalAmount,
  itemLabel = 'order',
  placement = 'bottom',
}: SaleOrderDateTotalBarProps) {
  const theme = useTheme();
  const orderWord = orderCount === 1 ? itemLabel : `${itemLabel}s`;

  return (
    <View
      style={[
        styles.root,
        placement === 'top' ? styles.rootTop : styles.rootBottom,
        {
          backgroundColor: theme.colors.primaryContainer,
          borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
        },
      ]}>
      <View style={styles.left}>
        <Icon source="cash-multiple" size={20} color={theme.colors.primary} />
        <View style={styles.textBlock}>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onPrimaryContainer, opacity: 0.85 }}>
            Filtered total · {dateLabel}
          </Text>
          <Text
            variant="labelLarge"
            style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700' }}>
            {orderCount.toLocaleString('en-US')} {orderWord}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onPrimaryContainer, opacity: 0.85 }}>
          Total amount
        </Text>
        <Text
          variant="titleLarge"
          style={{ color: theme.colors.primary, fontWeight: '800' }}>
          {formatMoney(totalAmount)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rootTop: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rootBottom: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
    minWidth: 0,
  },
  textBlock: {
    gap: 2,
    minWidth: 0,
  },
  right: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
  },
});
