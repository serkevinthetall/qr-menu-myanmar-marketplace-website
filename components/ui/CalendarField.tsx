import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Modal, Portal, Text, useTheme } from 'react-native-paper';

import { useAppColors } from '@/hooks/use-app-colors';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseISO(value: string): Date | null {
  if (!value) {
    return null;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function formatDisplay(date: Date): string {
  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type CalendarFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  compact?: boolean;
  variant?: 'default' | 'header';
};

export function CalendarField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  compact = false,
  variant = 'default',
}: CalendarFieldProps) {
  const theme = useTheme();
  const colors = useAppColors();
  const isHeader = variant === 'header';
  const [open, setOpen] = useState(false);
  const selected = parseISO(value);
  const [viewDate, setViewDate] = useState<Date>(selected ?? new Date());
  const today = new Date();

  const weeks = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(new Date(year, month, day));
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    const grouped: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      grouped.push(cells.slice(i, i + 7));
    }
    return grouped;
  }, [viewDate]);

  const openPicker = () => {
    setViewDate(selected ?? new Date());
    setOpen(true);
  };

  const goMonth = (delta: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const pickDay = (date: Date) => {
    onChange(toISO(date));
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
        onPress={openPicker}
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
          source="calendar"
          size={compact ? 18 : 20}
          color={isHeader ? colors.headerFieldMuted : theme.colors.onSurfaceVariant}
        />
        <Text
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
          {selected ? formatDisplay(selected) : placeholder}
        </Text>
        {value ? (
          <Pressable onPress={() => onChange('')} hitSlop={8}>
            <Icon source="close" size={18} color={theme.colors.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </Pressable>

      <Portal>
        <Modal
          visible={open}
          onDismiss={() => setOpen(false)}
          contentContainerStyle={[
            styles.modal,
            { backgroundColor: theme.colors.surface },
          ]}>
          <View style={styles.header}>
            <IconButton icon="chevron-left" size={22} onPress={() => goMonth(-1)} />
            <Text variant="titleMedium" style={styles.headerLabel}>
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </Text>
            <IconButton icon="chevron-right" size={22} onPress={() => goMonth(1)} />
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map(day => (
              <View key={day} style={styles.weekCell}>
                <Text
                  variant="labelSmall"
                  style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}>
                  {day}
                </Text>
              </View>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((date, di) => {
                if (!date) {
                  return <View key={di} style={styles.dayCell} />;
                }
                const isSelected = selected ? isSameDay(date, selected) : false;
                const isToday = isSameDay(date, today);
                return (
                  <Pressable
                    key={di}
                    onPress={() => pickDay(date)}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: theme.colors.primary },
                      !isSelected &&
                        isToday && {
                          borderWidth: 1,
                          borderColor: theme.colors.primary,
                        },
                    ]}>
                    <Text
                      style={{
                        color: isSelected
                          ? theme.colors.onPrimary
                          : theme.colors.onSurface,
                        fontWeight: isSelected || isToday ? '700' : '400',
                      }}>
                      {date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.footer}>
            <Pressable onPress={() => pickDay(new Date())} hitSlop={8}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                Today
              </Text>
            </Pressable>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  compactRoot: {
    flex: 1,
  },
  label: {
    marginBottom: 6,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  compactField: {
    height: 36,
    borderRadius: 18,
    gap: 8,
    paddingHorizontal: 12,
  },
  headerField: {
    width: '100%',
  },
  modal: {
    alignSelf: 'center',
    width: 320,
    maxWidth: '92%',
    borderRadius: 16,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: {
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  footer: {
    marginTop: 8,
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
});
