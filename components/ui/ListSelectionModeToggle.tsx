import { Pressable, StyleSheet, View } from 'react-native';
import { Checkbox, Text, useTheme } from 'react-native-paper';

type ListFilterCheckboxProps = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label?: string;
};

/** Checkbox for the search chevron filter panel (e.g. Group by date). */
export function ListFilterCheckbox({
  enabled,
  onChange,
  label = 'Group by date',
}: ListFilterCheckboxProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onChange(!enabled)}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel={label}>
      <Checkbox
        status={enabled ? 'checked' : 'unchecked'}
        onPress={() => onChange(!enabled)}
      />
      <Text
        variant="bodyMedium"
        style={{ color: theme.colors.onSurface, flex: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** @deprecated Use ListFilterCheckbox */
export const ListSelectionModeToggle = ListFilterCheckbox;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 2,
  },
});
