import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { useDetailTheme } from '@/hooks/use-detail-theme';
import {
  AiSuggestionItem,
  AiSuggestionPack,
  AiSuggestionsStatus,
} from '@/types/overview';
import { formatMyanmarDateTime } from '@/utils/myanmar-datetime';

function priorityColor(priority: AiSuggestionItem['priority']): string {
  switch (priority) {
    case 'high':
      return '#D63939';
    case 'low':
      return '#64748B';
    default:
      return '#F76707';
  }
}

function slotLabel(slot: AiSuggestionPack['slot']): string {
  switch (slot) {
    case 'monday':
      return 'Monday plan';
    case 'friday':
      return 'Friday review';
    case 'monthly':
      return 'Monthly review';
    default:
      return 'Manual';
  }
}

export function AiSuggestionsCard({
  status,
  generating,
  error,
  onGenerate,
}: {
  status: AiSuggestionsStatus | null;
  generating: boolean;
  error: string;
  onGenerate: () => void;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();

  if (!status?.enabled) {
    return null;
  }

  const pack = status.latest;
  const suggestions = pack?.suggestions ?? [];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: detail.surface,
          borderColor: detail.border,
          shadowColor: detail.shadow,
        },
      ]}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 160 }}>
          <Text style={[styles.title, { color: detail.onSurface }]}>
            Business suggestions
          </Text>
          <Text style={[styles.hint, { color: detail.label }]}>
            {status.configured
              ? pack
                ? `${slotLabel(pack.slot)} · ${formatMyanmarDateTime(pack.generatedAt) || pack.generatedAt}`
                : 'No suggestions yet — tap Process to analyse this month.'
              : 'Add GEMINI_API_KEY on the API to enable Process.'}
          </Text>
        </View>
        {status.configured ? (
          <Pressable
            onPress={onGenerate}
            disabled={generating}
            style={[
              styles.button,
              {
                backgroundColor: theme.colors.primary,
                opacity: generating ? 0.7 : 1,
              },
            ]}>
            {generating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon source="creation" size={16} color="#fff" />
            )}
            <Text style={styles.buttonText}>
              {generating ? 'Processing…' : 'Process'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={{ color: theme.colors.error, marginTop: 8 }}>{error}</Text>
      ) : null}

      {generating && suggestions.length === 0 ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={{ color: detail.label }}>
            Processing this month’s Overview with Gemini…
          </Text>
        </View>
      ) : null}

      {suggestions.map((item, index) => (
        <View
          key={`${item.title}-${index}`}
          style={[styles.item, { borderTopColor: detail.border }]}>
          <View style={styles.itemTop}>
            <View
              style={[
                styles.priorityDot,
                { backgroundColor: priorityColor(item.priority) },
              ]}
            />
            <Text style={[styles.itemTitle, { color: detail.onSurface }]}>
              {item.title}
            </Text>
            <Text
              style={[
                styles.priorityLabel,
                { color: priorityColor(item.priority) },
              ]}>
              {item.priority}
            </Text>
          </View>
          <Text style={[styles.itemDetail, { color: detail.label }]}>
            {item.detail}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  hint: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  loadingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingVertical: 8,
  },
  item: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
    gap: 4,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTitle: {
    flex: 1,
    fontWeight: '700',
    fontSize: 14,
  },
  priorityLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  itemDetail: {
    fontSize: 13,
    lineHeight: 19,
    paddingLeft: 16,
  },
});
