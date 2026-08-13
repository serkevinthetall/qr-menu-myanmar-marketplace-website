/** @temp-feature app-install-call-list */
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput, useTheme } from 'react-native-paper';

import { APP_INSTALL_REASON_OPTIONS, AppInstallReason } from './types';

export function NotInstalledReasonDialog({
  visible,
  onDismiss,
  onSelect,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (reason: AppInstallReason, reasonNote?: string) => void;
}) {
  const theme = useTheme();
  const [otherSelected, setOtherSelected] = useState(false);
  const [otherNote, setOtherNote] = useState('');

  const reset = () => {
    setOtherSelected(false);
    setOtherNote('');
  };

  const handleDismiss = () => {
    reset();
    onDismiss();
  };

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={handleDismiss}>
        <Dialog.Title>Why not installed?</Dialog.Title>
        <Dialog.Content>
          {APP_INSTALL_REASON_OPTIONS.map(opt => (
            <Pressable
              key={opt.id}
              onPress={() => {
                if (opt.id === 'other') {
                  setOtherSelected(true);
                  return;
                }
                reset();
                onSelect(opt.id);
              }}
              style={{
                paddingVertical: 12,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.outlineVariant,
                backgroundColor:
                  otherSelected && opt.id === 'other'
                    ? theme.colors.primaryContainer
                    : undefined,
              }}>
              <Text style={{ fontWeight: '600' }}>{opt.label}</Text>
            </Pressable>
          ))}
          {otherSelected ? (
            <View style={{ marginTop: 12, gap: 8 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                Type the reason
              </Text>
              <TextInput
                mode="outlined"
                dense
                value={otherNote}
                onChangeText={setOtherNote}
                placeholder="Enter reason…"
                autoFocus
              />
            </View>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={handleDismiss}>Cancel</Button>
          {otherSelected ? (
            <Button
              mode="contained"
              disabled={!otherNote.trim()}
              onPress={() => {
                const note = otherNote.trim();
                if (!note) return;
                reset();
                onSelect('other', note);
              }}>
              Save
            </Button>
          ) : null}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
