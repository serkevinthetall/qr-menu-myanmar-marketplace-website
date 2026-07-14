import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip } from 'react-native-paper';

import {
  QUOTATION_PERIOD_OPTIONS,
  QUOTATION_STATUS_FILTERS,
  QuotationFilters,
} from '@/components/quotation/quotation-filter-utils';
import { getFilterStatusColors } from '@/constants/status-colors';
import { useAppTheme } from '@/contexts/theme-context';
import { useAppColors } from '@/hooks/use-app-colors';
import { CalendarField } from '@/components/ui/CalendarField';
import { DropdownField } from '@/components/ui/DropdownField';

type QuotationFilterBarProps = {
  filters: QuotationFilters;
  onChange: (filters: QuotationFilters) => void;
};

export type { QuotationFilters } from '@/components/quotation/quotation-filter-utils';
export {
  EMPTY_QUOTATION_FILTERS,
  hasActiveQuotationFilters,
  matchesQuotationFilters,
} from '@/components/quotation/quotation-filter-utils';

export function QuotationFilterBar({ filters, onChange }: QuotationFilterBarProps) {
  const colors = useAppColors();
  const { mode } = useAppTheme();

  const toggleStatus = (key: string) => {
    const next = filters.statuses.includes(key)
      ? filters.statuses.filter(item => item !== key)
      : [...filters.statuses, key];
    onChange({ ...filters, statuses: next });
  };

  const periodLabel =
    QUOTATION_PERIOD_OPTIONS.find(item => item.value === filters.period)?.label ?? '';

  return (
    <View style={styles.root}>
      <View style={styles.controlsRow}>
        <DropdownField
          compact
          variant="header"
          placeholder="Period"
          value={periodLabel}
          options={QUOTATION_PERIOD_OPTIONS.map(item => item.label)}
          onChange={label => {
            if (!label) {
              onChange({ ...filters, period: '' });
              return;
            }
            const next =
              QUOTATION_PERIOD_OPTIONS.find(item => item.label === label)?.value ?? '';
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}>
        {QUOTATION_STATUS_FILTERS.map(status => {
          const selected = filters.statuses.includes(status.key);
          const statusColors = getFilterStatusColors(mode, status.key, {
            bg: status.bg,
            fg: status.fg,
          });
          return (
            <Chip
              key={status.key}
              compact
              selected={selected}
              onPress={() => toggleStatus(status.key)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? statusColors.bg : colors.headerChipBg,
                  borderColor: selected ? statusColors.fg : colors.headerChipBorder,
                },
              ]}
              textStyle={[
                styles.chipText,
                { color: selected ? statusColors.fg : colors.headerChipText },
              ]}>
              {status.label}
            </Chip>
          );
        })}
      </ScrollView>
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
  chips: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsScroll: {
    width: '100%',
  },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
