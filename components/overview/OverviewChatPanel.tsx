import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Dialog, Icon, Portal, Text, TextInput } from 'react-native-paper';

import { Palette } from '@/constants/colors';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { generateSixMonthAiSuggestions, sendOverviewChat } from '@/services/insights';
import { OverviewChatTurn, OverviewPeriod } from '@/types/overview';

const WELCOME =
  'Ask about this period’s sales, purchases, customers, areas, or products. Chat and Analyze six month both use Gemini.';

export function OverviewChatPanel({
  visible,
  onClose,
  token,
  period,
  periodLabel,
}: {
  visible: boolean;
  onClose: () => void;
  token: string;
  period: OverviewPeriod;
  periodLabel: string;
}) {
  const detail = useDetailTheme();
  const { width, height, isMobile } = useResponsive();
  const scrollRef = useRef<ScrollView>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<OverviewChatTurn[]>([]);
  const [notice, setNotice] = useState<{ title: string; message: string } | null>(
    null,
  );

  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages, visible, sending]);

  if (!visible) {
    return null;
  }

  const panelWidth = isMobile ? Math.min(width - 24, 400) : 380;
  const panelHeight = Math.min(Math.max(height - 170, 420), 560);

  async function send() {
    const text = draft.trim();
    if (!text || sending) {
      return;
    }
    const nextMessages: OverviewChatTurn[] = [
      ...messages,
      { role: 'user', content: text },
    ];
    setDraft('');
    setMessages(nextMessages);
    setSending(true);
    try {
      const result = await sendOverviewChat(token, text, period, messages);
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: result.reply || 'No reply.' },
      ]);
      if (result.warning) {
        setNotice({ title: 'AI not working', message: result.warning });
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send message.';
      setNotice({ title: 'AI not working', message });
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: message,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function formatSuggestionsForChat(
    suggestions: { title: string; detail: string }[],
  ) {
    return suggestions
      .slice(0, 5)
      .map((s, idx) => `${idx + 1}. ${s.title}\n${s.detail}`)
      .join('\n\n');
  }

  async function analyseSixMonth() {
    if (sending) return;
    setSending(true);
    try {
      const pack = await generateSixMonthAiSuggestions(token);
      const reply =
        pack?.suggestions?.length ? formatSuggestionsForChat(pack.suggestions) : 'No suggestions.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to analyze six months.';
      setNotice({ title: 'Gemini is not working', message });
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: message,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
    <View
      style={[
        styles.panel,
        {
          width: panelWidth,
          height: panelHeight,
          right: isMobile ? 12 : 20,
          backgroundColor: detail.surface,
          borderColor: detail.border,
          shadowColor: detail.shadow,
        },
        Platform.OS === 'web' ? ({ position: 'fixed' } as const) : null,
      ]}>
      <View style={[styles.header, { borderBottomColor: detail.border }]}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, { color: detail.onSurface }]}>
            QR Shop chat
          </Text>
          <Text style={[styles.subtitle, { color: detail.label }]}>
            {periodLabel}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close chat"
          style={styles.closeBtn}>
          <Icon source="close" size={20} color={detail.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        keyboardShouldPersistTaps="handled">
        {messages.length === 0 ? (
          <View style={styles.bubbleRow}>
            <View style={[styles.bubble, { backgroundColor: detail.panelBg }]}>
              <Text
                style={{
                  color: detail.onSurface,
                  fontSize: 14,
                  lineHeight: 20,
                }}>
                {WELCOME}
              </Text>
            </View>
          </View>
        ) : null}
        {messages.map((row, index) => {
          const mine = row.role === 'user';
          return (
            <View
              key={`${row.role}-${index}`}
              style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
              <View
                style={[
                  styles.bubble,
                  mine
                    ? { backgroundColor: Palette.primary }
                    : { backgroundColor: detail.panelBg },
                ]}>
                <Text
                  style={{
                    color: mine ? Palette.onPrimary : detail.onSurface,
                    fontSize: 14,
                    lineHeight: 20,
                  }}>
                  {row.content}
                </Text>
              </View>
            </View>
          );
        })}
        {sending ? (
          <View style={styles.bubbleRow}>
            <View style={[styles.bubble, { backgroundColor: detail.panelBg }]}>
              <ActivityIndicator size={16} color={Palette.primary} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.sixMonthRow, { borderTopColor: detail.border }]}>
        <Pressable
          onPress={() => {
            void analyseSixMonth();
          }}
          disabled={sending}
          accessibilityRole="button"
          accessibilityLabel="Analyze six month"
          style={[
            styles.sixMonthBtn,
            {
              borderColor: detail.border,
              backgroundColor: Palette.card,
            },
            sending && { opacity: 0.55 },
          ]}>
          {sending ? (
            <ActivityIndicator size={16} color={detail.onSurface} />
          ) : (
            <Text style={{ color: detail.onSurface, fontWeight: '700', fontSize: 12 }}>
              Analyze six month
            </Text>
          )}
        </Pressable>
      </View>

      <View style={[styles.composer, { borderTopColor: detail.border }]}>
        <TextInput
          mode="outlined"
          dense
          value={draft}
          onChangeText={setDraft}
          placeholder="Type a message"
          style={styles.input}
          outlineStyle={styles.inputOutline}
          editable={!sending}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => {
            void send();
          }}
          onKeyPress={event => {
            if (event.nativeEvent.key === 'Enter') {
              event.preventDefault?.();
              void send();
            }
          }}
        />
        <Pressable
          onPress={() => {
            void send();
          }}
          disabled={sending || !draft.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={[
            styles.sendBtn,
            { backgroundColor: Palette.primary },
            (sending || !draft.trim()) && { opacity: 0.45 },
          ]}>
          <Icon source="send" size={18} color={Palette.onPrimary} />
        </Pressable>
      </View>
    </View>
    <Portal>
      <Dialog
        visible={Boolean(notice)}
        onDismiss={() => setNotice(null)}>
        <Dialog.Title>{notice?.title ?? 'AI not working'}</Dialog.Title>
        <Dialog.Content>
          <Text>{notice?.message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setNotice(null)}>OK</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    right: 20,
    bottom: 108,
    width: 380,
    height: 520,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    zIndex: 1001,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thread: {
    flex: 1,
    minHeight: 0,
  },
  threadContent: {
    padding: 12,
    gap: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    backgroundColor: Palette.card,
  },
  inputOutline: {
    borderRadius: 12,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sixMonthRow: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  sixMonthBtn: {
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
