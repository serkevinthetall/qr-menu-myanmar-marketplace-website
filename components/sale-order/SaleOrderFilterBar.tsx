import { StyleSheet, View } from 'react-native';

import {
  SALE_ORDER_PERIOD_OPTIONS,
  SaleOrderFilters,
} from '@/components/sale-order/sale-order-filter-utils';
import { CalendarField } from '@/components/ui/CalendarField';
import { DropdownField } from '@/components/ui/DropdownField';

type SaleOrderFilterBarProps = {
  filters: SaleOrderFilters;
  onChange: (filters: SaleOrderFilters) => void;
};

export type { SaleOrderFilters } from '@/components/sale-order/sale-order-filter-utils';
export {
  EMPTY_SALE_ORDER_FILTERS,
  getSaleOrderFilterDateLabel,
  hasActiveSaleOrderFilters,
  matchesSaleOrderFilters,
} from '@/components/sale-order/sale-order-filter-utils';

export function SaleOrderFilterBar({
  filters,
  onChange,
}: SaleOrderFilterBarProps) {
  const periodLabel =
    SALE_ORDER_PERIOD_OPTIONS.find(item => item.value === filters.period)
      ?.label ?? '';

  return (
    <View style={styles.root}>
      <View style={styles.controlsRow}>
        <DropdownField
          compact
          variant="header"
          placeholder="Period"
          value={periodLabel}
          options={SALE_ORDER_PERIOD_OPTIONS.map(item => item.label)}
          onChange={label => {
            if (!label) {
              onChange({ ...filters, period: '' });
              return;
            }
            const next =
              SALE_ORDER_PERIOD_OPTIONS.find(item => item.label === label)
                ?.value ?? '';
            onChange({ ...filters, period: next, startDate: '', endDate: '' });
          }}
          sortOptions={false}
        />
        <View style={styles.dateField}>
          <CalendarField
            compact
            variant="header"
            value={filters.startDate}
            onChange={startDate => onChange({ ...filters, startDate, period: '' })}
            placeholder="Start date"
          />
        </View>
        <View style={styles.dateField}>
          <CalendarField
            compact
            variant="header"
            value={filters.endDate}
            onChange={endDate => onChange({ ...filters, endDate, period: '' })}
            placeholder="End date"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
    paddingHorizontal: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dateField: {
    minWidth: 130,
    maxWidth: 170,
  },
});
