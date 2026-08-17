import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { useDetailTheme } from '@/hooks/use-detail-theme';
import { AiSuggestionItem, AiSuggestionPack } from '@/types/overview';

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

export function CompareAiPanel({
  generating,
  error,
  pack,
  onGenerate,
}: {
  generating: boolean;
  error: string;
  pack: AiSuggestionPack | null;
  onGenerate: () => void;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const suggestions = pack?.suggestions ?? [];

  return (
    <View style={[styles.wrap, { borderColor: detail.border }]}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <Text style={[styles.title, { color: detail.onSurface }]}>
            Last month comparison
          </Text>
          <Text style={[styles.hint, { color: detail.label }]}>
            Tap Process to compare this period with last month.
          </Text>
        </View>
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
      </View>

      {error ? (
        <Text style={{ color: theme.colors.error }}>{error}</Text>
      ) : null}

      {generating && suggestions.length === 0 ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={{ color: detail.label }}>
            ယခုကာလနှင့် ယခင်လကို နှိုင်းယှဉ်နေပါသည်…
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
  wrap: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
  },
  hint: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
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
    paddingVertical: 4,
  },
  item: {
    borderTopWidth: 1,
    paddingTop: 10,
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
