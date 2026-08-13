/** @temp-feature app-install-call-list */
import { useEffect, useState } from 'react';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';

export function WaitingNoteDialog({
  visible,
  contactName,
  onDismiss,
  onSave,
}: {
  visible: boolean;
  contactName?: string;
  onDismiss: () => void;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) {
      setNote('');
    }
  }, [visible]);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Waiting note</Dialog.Title>
        <Dialog.Content>
          <Text style={{ marginBottom: 12, opacity: 0.75 }}>
            Type why {contactName || 'this contact'} is waiting.
          </Text>
          <TextInput
            mode="outlined"
            dense
            value={note}
            onChangeText={setNote}
            placeholder="Enter waiting note…"
            autoFocus
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            mode="contained"
            disabled={!note.trim()}
            onPress={() => {
              const trimmed = note.trim();
              if (!trimmed) return;
              onSave(trimmed);
            }}>
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
