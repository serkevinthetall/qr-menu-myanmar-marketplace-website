import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Modal, Portal, Text, useTheme } from 'react-native-paper';

import { useAppColors } from '@/hooks/use-app-colors';

type DropdownFieldProps = {
  label?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  variant?: 'default' | 'header';
  sortOptions?: boolean;
  /** When false, hides the top “All” clear option. Default true. */
  showClearOption?: boolean;
  clearLabel?: string;
};

export function DropdownField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select',
  compact = false,
  variant = 'default',
  sortOptions = true,
  showClearOption = true,
  clearLabel = 'All',
}: DropdownFieldProps) {
  const theme = useTheme();
  const colors = useAppColors();
  const [open, setOpen] = useState(false);
  const isHeader = variant === 'header';

  const sortedOptions = useMemo(
    () => (sortOptions ? [...options].sort((a, b) => a.localeCompare(b)) : options),
    [options, sortOptions],
  );

  const pick = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <View style={compact ? styles.compactRoot : undefined}>
      {label && !compact ? (
        <Text
          variant="labelMedium"
          style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {label}
        </Text>
      ) : null}

      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          compact && styles.compactField,
          isHeader && styles.headerField,
          {
            borderColor: isHeader ? colors.headerFieldBorder : theme.colors.outline,
            backgroundColor: isHeader ? colors.headerFieldBg : theme.colors.surface,
          },
        ]}>
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            color: value
              ? isHeader
                ? colors.headerFieldText
                : theme.colors.onSurface
              : isHeader
                ? colors.headerFieldMuted
                : theme.colors.onSurfaceVariant,
            fontSize: compact ? 13 : 15,
          }}>
          {value || placeholder}
        </Text>
        <Icon
          source="chevron-down"
          size={compact ? 18 : 22}
          color={isHeader ? colors.headerFieldMuted : theme.colors.onSurfaceVariant}
        />
      </Pressable>

      <Portal>
        <Modal
          visible={open}
          onDismiss={() => setOpen(false)}
          contentContainerStyle={styles.modalHost}>
          <View
            style={[
              styles.modal,
              { backgroundColor: theme.colors.surface },
            ]}>
            <Text variant="titleMedium" style={styles.modalTitle}>
              {label || placeholder}
            </Text>
            <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
              {showClearOption ? (
                <Pressable
                  onPress={() => pick('')}
                  style={({ pressed }) => [
                    styles.option,
                    pressed && { backgroundColor: theme.colors.surfaceVariant },
                  ]}>
                  <Text style={{ color: theme.colors.onSurfaceVariant }}>
                    {clearLabel}
                  </Text>
                </Pressable>
              ) : null}
              {sortedOptions.map(option => (
                <Pressable
                  key={option}
                  onPress={() => pick(option)}
                  style={({ pressed }) => [
                    styles.option,
                    value === option && {
                      backgroundColor: theme.colors.primaryContainer,
                    },
                    pressed && { backgroundColor: theme.colors.surfaceVariant },
                  ]}>
                  <Text
                    style={{
                      color:
                        value === option
                          ? theme.colors.onPrimaryContainer
                          : theme.colors.onSurface,
                      fontWeight: value === option ? '600' : '400',
                    }}>
                    {option}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  compactRoot: {
    minWidth: 140,
    maxWidth: 200,
  },
  label: {
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  compactField: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 12,
  },
  headerField: {
    minWidth: 120,
  },
  modalHost: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  modal: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '70%',
    borderRadius: 16,
    padding: 12,
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  list: {
    maxHeight: 360,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
});
