import { StyleSheet, View } from 'react-native';
import { Chip } from 'react-native-paper';

type ListFilterCheckboxProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
};

/** Toggle chip for the search chevron filter panel (e.g. Group by date). */
export function ListFilterCheckbox({
  enabled,
  onChange,
  label = 'Group by date',
}: ListFilterCheckboxProps) {
  return (
    <View style={styles.row}>
      <Chip
        compact
        selected={enabled}
        onPress={() => onChange(!enabled)}
        accessibilityRole="button"
        accessibilityState={{ selected: enabled }}
        accessibilityLabel={label}
        style={styles.chip}>
        {label}
      </Chip>
    </View>
  );
}

/** @deprecated Use ListFilterCheckbox */
export const ListSelectionModeToggle = ListFilterCheckbox;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 4,
    justifyContent: 'center',
  },
  chip: {
    marginRight: 0,
  },
});
