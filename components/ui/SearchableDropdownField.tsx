import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

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
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

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

  const pick = (option: string) => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setQuery(option);
    onChange(option);
    setOpen(false);
  };

  const clearSelection = () => {
    setQuery('');
    onChange('');
    setOpen(false);
  };

  const handleFocus = () => {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setOpen(true);
  };

  const handleBlur = () => {
    blurTimer.current = setTimeout(() => {
      setOpen(false);
      if (!query.trim()) {
        onChange('');
        return;
      }
      const exact = sortedOptions.find(
        option => option.toLowerCase() === query.trim().toLowerCase(),
      );
      if (exact) {
        setQuery(exact);
        onChange(exact);
        return;
      }
      setQuery(value);
    }, 150);
  };

  return (
    <View style={[compact ? styles.compactRoot : undefined, styles.wrapper]}>
      {label && !compact ? (
        <Text
          variant="labelMedium"
          style={[styles.label, { color: theme.colors.onSurfaceVariant }]}>
          {label}
        </Text>
      ) : null}

      <View
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
        <TextInput
          value={query}
          onChangeText={text => {
            setQuery(text);
            setOpen(true);
            onChange(text.trim());
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={isHeader ? colors.headerFieldMuted : theme.colors.onSurfaceVariant}
          style={[
            styles.input,
            {
              color: isHeader ? colors.headerFieldText : theme.colors.onSurface,
              fontSize: compact ? 13 : 15,
            },
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
          ]}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query ? (
          <Pressable onPress={clearSelection} hitSlop={8} accessibilityLabel="Clear township">
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
      </View>

      {open && filteredOptions.length > 0 ? (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: isHeader ? colors.headerFieldBg : theme.colors.surface,
              borderColor: isHeader ? colors.headerFieldBorder : theme.colors.outline,
            },
          ]}>
          <ScrollView
            style={styles.dropdownList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled>
            {!query.trim() ? (
              <Pressable
                onPress={clearSelection}
                style={({ pressed }) => [
                  styles.option,
                  pressed && { backgroundColor: theme.colors.surfaceVariant },
                ]}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>All townships</Text>
              </Pressable>
            ) : null}
            {filteredOptions.map(option => (
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
      ) : open && query.trim() ? (
        <View
          style={[
            styles.dropdown,
            styles.emptyDropdown,
            {
              backgroundColor: isHeader ? colors.headerFieldBg : theme.colors.surface,
              borderColor: isHeader ? colors.headerFieldBorder : theme.colors.outline,
            },
          ]}>
          <Text style={{ color: theme.colors.onSurfaceVariant, padding: 12 }}>
            No townships match &quot;{query.trim()}&quot;
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 20,
  },
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
  input: {
    flex: 1,
    padding: 0,
    margin: 0,
    minWidth: 0,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: 220,
    zIndex: 30,
    elevation: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  emptyDropdown: {
    maxHeight: undefined,
  },
  dropdownList: {
    maxHeight: 220,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
});
