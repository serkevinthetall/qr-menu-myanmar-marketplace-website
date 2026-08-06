import { useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import { DismissibleModal } from '@/components/ui/DismissibleModal';
import { useAppColors } from '@/hooks/use-app-colors';

type SearchableDropdownFieldProps = {
  label?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  variant?: 'default' | 'header';
  sortOptions?: boolean;
};

export function SearchableDropdownField({
  label,
  value,
  options,
  onChange,
  placeholder = 'Search',
  compact = false,
  variant = 'default',
  sortOptions = true,
}: SearchableDropdownFieldProps) {
  const theme = useTheme();
  const colors = useAppColors();
  const isHeader = variant === 'header';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) {
      setQuery('');
    }
  }, [open]);

  const sortedOptions = useMemo(() => {
    const unique = Array.from(
      new Set(options.map(option => option.replace(/\s+/g, ' ').trim()).filter(Boolean)),
    );
    return sortOptions ? unique.sort((a, b) => a.localeCompare(b)) : unique;
  }, [options, sortOptions]);

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return sortedOptions;
    }
    return sortedOptions.filter(option => option.toLowerCase().includes(term));
  }, [query, sortedOptions]);

  const close = () => setOpen(false);

  const pick = (option: string) => {
    onChange(option);
    close();
  };

  const clearSelection = () => {
    onChange('');
    close();
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
        <Icon
          source="magnify"
          size={compact ? 16 : 18}
          color={isHeader ? colors.headerFieldMuted : theme.colors.onSurfaceVariant}
        />
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
        {value ? (
          <Pressable
            onPress={e => {
              e.stopPropagation?.();
              clearSelection();
            }}
            hitSlop={8}
            accessibilityLabel="Clear selection">
            <Icon
              source="close-circle"
              size={compact ? 16 : 18}
              color={isHeader ? colors.headerFieldMuted : theme.colors.onSurfaceVariant}
            />
          </Pressable>
        ) : (
          <Icon
            source="chevron-down"
            size={compact ? 18 : 22}
            color={isHeader ? colors.headerFieldMuted : theme.colors.onSurfaceVariant}
          />
        )}
      </Pressable>

      <DismissibleModal
        visible={open}
        onDismiss={close}
        title={label || placeholder}
        contentContainerStyle={styles.modal}>
        <View
          style={[
            styles.searchBox,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}>
          <Icon source="magnify" size={18} color={theme.colors.onSurfaceVariant} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${placeholder.toLowerCase()}…`}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            style={[
              styles.searchInput,
              { color: theme.colors.onSurface },
              Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
            ]}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Icon source="close-circle" size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled>
          <Pressable
            onPress={clearSelection}
            style={({ pressed }) => [
              styles.option,
              pressed && { backgroundColor: theme.colors.surfaceVariant },
            ]}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>All townships</Text>
          </Pressable>

          {filteredOptions.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant, padding: 12 }}>
              No townships match &quot;{query.trim()}&quot;
            </Text>
          ) : (
            filteredOptions.map(option => (
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
            ))
          )}
        </ScrollView>
      </DismissibleModal>
    </View>
  );
}

const styles = StyleSheet.create({
  compactRoot: {
    minWidth: 160,
    maxWidth: 220,
  },
  label: {
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  compactField: {
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 10,
  },
  headerField: {
    minWidth: 150,
  },
  modal: {
    maxWidth: 420,
    maxHeight: '80%',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    padding: 0,
    margin: 0,
    minWidth: 0,
    fontSize: 14,
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
