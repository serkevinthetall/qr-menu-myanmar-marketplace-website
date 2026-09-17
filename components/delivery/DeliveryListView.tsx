import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { DeliveryPreview } from '@/types/delivery';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';

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

type Props = {
  deliveries: DeliveryPreview[];
  loading: boolean;
  error: string;
  onOpen: (pickingId: string) => void;
};

export function DeliveryListView({
  deliveries,
  loading,
  error,
  onOpen,
}: Props) {
  const theme = useTheme();
  const isDark = theme.dark;
  const border = theme.colors.outlineVariant ?? theme.colors.outline;
  const muted = theme.colors.onSurfaceVariant;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={{ marginTop: 12, color: muted }}>Loading deliveries…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.colors.error, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (deliveries.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={{ color: muted, textAlign: 'center' }}>
          No outgoing deliveries found for this order.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.headerRow,
          { backgroundColor: theme.colors.primary },
        ]}>
        <Text style={[styles.th, styles.colName, { color: theme.colors.onPrimary }]}>
          Reference
        </Text>
        <Text style={[styles.th, styles.colStatus, { color: theme.colors.onPrimary }]}>
          Status
        </Text>
        <Text style={[styles.th, styles.colDate, { color: theme.colors.onPrimary }]}>
          Scheduled
        </Text>
        <Text style={[styles.th, styles.colLines, { color: theme.colors.onPrimary }]}>
          Lines
        </Text>
      </View>

      {deliveries.map((item, index) => {
        const colors = statusColors(item.state, isDark);
        const zebra = index % 2 === 1;
        return (
          <Pressable
            key={item.id}
            onPress={() => onOpen(item.id)}
            style={({ pressed, hovered }) => [
              styles.row,
              {
                backgroundColor: pressed || hovered
                  ? theme.colors.primaryContainer
                  : zebra
                    ? theme.colors.surfaceVariant
                    : theme.colors.surface,
                borderBottomColor: border,
              },
            ]}>
            <View style={styles.colName}>
              <View style={styles.nameRow}>
                <Icon
                  source="truck-delivery-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text
                  style={[styles.name, { color: theme.colors.primary }]}
                  numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              {item.partner ? (
                <Text style={{ color: muted, fontSize: 12 }} numberOfLines={1}>
                  {item.partner}
                </Text>
              ) : null}
            </View>
            <View style={styles.colStatus}>
              <View style={[styles.badge, { backgroundColor: colors.bg }]}>
                <Text style={[styles.badgeText, { color: colors.fg }]}>
                  {item.stateLabel}
                </Text>
              </View>
            </View>
            <Text
              style={[styles.cell, styles.colDate, { color: theme.colors.onSurface }]}
              numberOfLines={1}>
              {formatMyanmarDateTime(item.scheduledDate, { empty: '—' }) || '—'}
            </Text>
            <Text
              style={[styles.cell, styles.colLines, { color: theme.colors.onSurface }]}
              numberOfLines={1}>
              {item.lines.length}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: 24 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
    minHeight: 56,
  },
  th: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cell: { fontSize: 13 },
  colName: { flex: 2.2, minWidth: 140, gap: 2 },
  colStatus: { flex: 0.9, minWidth: 88 },
  colDate: { flex: 1.2, minWidth: 110 },
  colLines: { flex: 0.5, minWidth: 48, textAlign: 'right' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontWeight: '700', fontSize: 14, flex: 1 },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
});
