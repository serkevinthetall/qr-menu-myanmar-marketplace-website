import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Dialog,
  Icon,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { DropdownField } from '@/components/ui/DropdownField';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import {
  cancelChatterActivity,
  fetchChatter,
  markChatterActivityDone,
  postChatterMessage,
  postChatterNote,
  scheduleChatterActivity,
} from '@/services/chatter';
import {
  ChatterActivity,
  ChatterBasePath,
  ChatterMessage,
  ChatterPayload,
} from '@/types/chatter';
import {
  formatMyanmarDate,
  formatMyanmarDateTime,
} from '@/utils/myanmar-datetime';

type ComposerMode = 'message' | 'note' | 'activity' | null;

type ChatterPanelProps = {
  token: string;
  basePath: ChatterBasePath;
  recordId: string;
};

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function groupMessagesByDay(messages: ChatterMessage[]) {
  const groups: { label: string; items: ChatterMessage[] }[] = [];
  const map = new Map<string, ChatterMessage[]>();

  for (const msg of messages) {
    const dayKey = msg.date?.slice(0, 10) || 'unknown';
    const list = map.get(dayKey) ?? [];
    list.push(msg);
    map.set(dayKey, list);
  }

  for (const [day, items] of map) {
    const label =
      formatMyanmarDate(day) ||
      (day === todayIsoDate() ? 'Today' : day);
    groups.push({ label, items });
  }
  return groups;
}

function ActivityCard({
  activity,
  busy,
  onDone,
  onCancel,
}: {
  activity: ChatterActivity;
  busy: boolean;
  onDone: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const overdue = activity.state === 'overdue';
  const title =
    activity.summary?.trim() ||
    activity.activityType?.trim() ||
    'Activity';

  return (
    <View
      style={[
        styles.activityCard,
        {
          backgroundColor: detail.panelBg,
          borderColor: overdue ? theme.colors.error : detail.border,
        },
      ]}>
      <View style={styles.activityHeader}>
        <Icon
          source="calendar-clock"
          size={18}
          color={overdue ? theme.colors.error : theme.colors.primary}
        />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            style={{
              color: detail.onSurface,
              fontWeight: '700',
              fontSize: 14,
            }}
            numberOfLines={2}>
            {title}
          </Text>
          <Text style={{ color: detail.label, fontSize: 12 }} numberOfLines={1}>
            {[
              activity.activityType,
              activity.deadline
                ? `Due ${formatMyanmarDate(activity.deadline) || activity.deadline}`
                : null,
              activity.assignedTo ? `→ ${activity.assignedTo}` : null,
              activity.state ? activity.state : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>
      {activity.note?.trim() ? (
        <Text style={{ color: detail.cellText, fontSize: 13, marginTop: 6 }}>
          {activity.note}
        </Text>
      ) : null}
      <View style={styles.activityActions}>
        <Button compact mode="text" disabled={busy} onPress={onDone}>
          Mark Done
        </Button>
        <Button compact mode="text" disabled={busy} onPress={onCancel}>
          Cancel
        </Button>
      </View>
    </View>
  );
}

function MessageRow({ message }: { message: ChatterMessage }) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const badge = message.isNote
    ? 'Note'
    : message.messageType === 'email' || message.messageType === 'comment'
      ? 'Message'
      : 'Log';

  return (
    <View style={styles.messageRow}>
      <View
        style={[
          styles.avatar,
          { backgroundColor: theme.colors.primaryContainer },
        ]}>
        <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
          {(message.author || '?').slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <View style={styles.messageMeta}>
          <Text
            style={{ color: detail.onSurface, fontWeight: '700', fontSize: 13 }}
            numberOfLines={1}>
            {message.author || 'System'}
          </Text>
          <Text style={{ color: detail.label, fontSize: 11 }}>
            {formatMyanmarDateTime(message.date) || message.date || '—'}
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: message.isNote
                  ? theme.colors.secondaryContainer
                  : theme.colors.primaryContainer,
              },
            ]}>
            <Text
              style={{
                color: message.isNote
                  ? theme.colors.onSecondaryContainer
                  : theme.colors.primary,
                fontSize: 10,
                fontWeight: '700',
              }}>
              {badge}
            </Text>
          </View>
        </View>
        {message.subject?.trim() ? (
          <Text style={{ color: detail.label, fontSize: 12, fontWeight: '600' }}>
            {message.subject}
          </Text>
        ) : null}
        <Text style={{ color: detail.cellText, fontSize: 13, lineHeight: 18 }}>
          {message.body?.trim() || '—'}
        </Text>
      </View>
    </View>
  );
}

export function ChatterPanel({
  token,
  basePath,
  recordId,
}: ChatterPanelProps) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const [payload, setPayload] = useState<ChatterPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [composer, setComposer] = useState<ComposerMode>(null);
  const [draft, setDraft] = useState('');
  const [activitySummary, setActivitySummary] = useState('');
  const [activityDeadline, setActivityDeadline] = useState(todayIsoDate());
  const [activityTypeName, setActivityTypeName] = useState('');

  const load = useCallback(async () => {
    if (!token || !recordId) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchChatter(token, basePath, recordId);
      setPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chatter.');
    } finally {
      setLoading(false);
    }
  }, [token, basePath, recordId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activityTypeOptions = useMemo(
    () => (payload?.activityTypes ?? []).map(t => t.name),
    [payload?.activityTypes],
  );

  useEffect(() => {
    if (!activityTypeName && activityTypeOptions[0]) {
      setActivityTypeName(activityTypeOptions[0]);
    }
  }, [activityTypeName, activityTypeOptions]);

  const closeComposer = () => {
    setComposer(null);
    setDraft('');
    setActivitySummary('');
    setActivityDeadline(todayIsoDate());
  };

  const applyPayload = (data: ChatterPayload) => {
    setPayload(data);
    closeComposer();
  };

  const submitComposer = async () => {
    if (!composer || busy) return;
    setBusy(true);
    setError('');
    try {
      if (composer === 'note') {
        applyPayload(await postChatterNote(token, basePath, recordId, draft));
      } else if (composer === 'message') {
        applyPayload(
          await postChatterMessage(token, basePath, recordId, draft),
        );
      } else {
        const type = (payload?.activityTypes ?? []).find(
          t => t.name === activityTypeName,
        );
        applyPayload(
          await scheduleChatterActivity(token, basePath, recordId, {
            summary: activitySummary.trim() || draft.trim() || undefined,
            note: draft.trim() || undefined,
            deadline: activityDeadline.trim() || undefined,
            activityTypeId: type?.id,
          }),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const onMarkDone = async (activityId: string) => {
    setBusy(true);
    setError('');
    try {
      setPayload(
        await markChatterActivityDone(token, basePath, recordId, activityId),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark done.');
    } finally {
      setBusy(false);
    }
  };

  const onCancelActivity = async (activityId: string) => {
    setBusy(true);
    setError('');
    try {
      setPayload(
        await cancelChatterActivity(token, basePath, recordId, activityId),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel activity.');
    } finally {
      setBusy(false);
    }
  };

  const messageGroups = useMemo(
    () => groupMessagesByDay(payload?.messages ?? []),
    [payload?.messages],
  );

  const composerTitle =
    composer === 'message'
      ? 'Send message'
      : composer === 'note'
        ? 'Log note'
        : 'Schedule activity';

  return (
    <View style={styles.root}>
      <View style={styles.actionsRow}>
        <ActionChip
          icon="email-outline"
          label="Send message"
          onPress={() => setComposer('message')}
          disabled={busy || loading}
        />
        <ActionChip
          icon="note-text-outline"
          label="Log note"
          onPress={() => setComposer('note')}
          disabled={busy || loading}
        />
        <ActionChip
          icon="calendar-plus"
          label="Activity"
          onPress={() => setComposer('activity')}
          disabled={busy || loading}
        />
      </View>

      {error ? (
        <Text style={{ color: theme.colors.error, fontSize: 13 }}>{error}</Text>
      ) : null}

      {loading && !payload ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {(payload?.activities?.length ?? 0) > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: detail.label }]}>
                PLANNED ACTIVITIES
              </Text>
              {payload!.activities.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  busy={busy}
                  onDone={() => void onMarkDone(activity.id)}
                  onCancel={() => void onCancelActivity(activity.id)}
                />
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: detail.label }]}>
              HISTORY
            </Text>
            {messageGroups.length === 0 ? (
              <Text style={{ color: detail.label, fontSize: 13 }}>
                No messages yet.
              </Text>
            ) : (
              messageGroups.map(group => (
                <View key={group.label} style={styles.dayGroup}>
                  <View style={styles.dayDivider}>
                    <View
                      style={[styles.dayLine, { backgroundColor: detail.border }]}
                    />
                    <Text style={{ color: detail.label, fontSize: 11, fontWeight: '700' }}>
                      {group.label}
                    </Text>
                    <View
                      style={[styles.dayLine, { backgroundColor: detail.border }]}
                    />
                  </View>
                  {group.items.map(msg => (
                    <MessageRow key={msg.id} message={msg} />
                  ))}
                </View>
              ))
            )}
          </View>
        </>
      )}

      <Portal>
        <Dialog visible={composer != null} onDismiss={busy ? undefined : closeComposer}>
          <Dialog.Title>{composerTitle}</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            {composer === 'activity' ? (
              <>
                {activityTypeOptions.length > 0 ? (
                  <DropdownField
                    label="Activity type"
                    value={activityTypeName}
                    options={activityTypeOptions}
                    onChange={setActivityTypeName}
                    showClearOption={false}
                    sortOptions={false}
                  />
                ) : null}
                <TextInput
                  mode="outlined"
                  dense
                  label="Summary"
                  value={activitySummary}
                  onChangeText={setActivitySummary}
                  placeholder="e.g. Call back customer"
                />
                <TextInput
                  mode="outlined"
                  dense
                  label="Deadline (YYYY-MM-DD)"
                  value={activityDeadline}
                  onChangeText={setActivityDeadline}
                  placeholder={todayIsoDate()}
                />
              </>
            ) : null}
            <TextInput
              mode="outlined"
              multiline
              numberOfLines={4}
              label={composer === 'activity' ? 'Note (optional)' : 'Content'}
              value={draft}
              onChangeText={setDraft}
              placeholder={
                composer === 'note'
                  ? 'Internal note…'
                  : composer === 'message'
                    ? 'Message to followers…'
                    : 'Optional details…'
              }
            />
            {composer === 'message' ? (
              <Text style={{ color: detail.label, fontSize: 12 }}>
                Posts a comment on this order (notifies followers in Odoo).
              </Text>
            ) : null}
            {composer === 'note' ? (
              <Text style={{ color: detail.label, fontSize: 12 }}>
                Internal only — not sent to the customer.
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button disabled={busy} onPress={closeComposer}>
              Cancel
            </Button>
            <Button
              mode="contained"
              loading={busy}
              disabled={
                busy ||
                (composer !== 'activity' && !draft.trim()) ||
                (composer === 'activity' &&
                  !activitySummary.trim() &&
                  !draft.trim())
              }
              onPress={() => void submitComposer()}>
              {composer === 'activity' ? 'Schedule' : 'Post'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: detail.border,
          backgroundColor: pressed
            ? theme.colors.primaryContainer
            : detail.panelBg,
          opacity: disabled ? 0.5 : 1,
        },
      ]}>
      <Icon source={icon} size={16} color={theme.colors.primary} />
      <Text style={{ color: detail.onSurface, fontWeight: '600', fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 14,
    paddingTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  activityCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  activityActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  dayGroup: {
    gap: 12,
  },
  dayDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dayLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  messageMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
