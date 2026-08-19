/** @temp-feature app-install-call-list */
import { Button, Dialog, Portal, Text } from 'react-native-paper';

export function mongoSaveErrorMessage(err: unknown, action: string): string {
  const raw = err instanceof Error ? err.message.trim() : '';
  if (/mongo/i.test(raw) || /MONGODB_URI/i.test(raw)) {
    return raw;
  }
  if (/failed to fetch/i.test(raw) || /could not reach/i.test(raw)) {
    return `Could not reach the server. ${action} was not saved to App User List.`;
  }
  if (raw) {
    return `${action} was not saved to App User List.\n\n${raw}`;
  }
  return `${action} was not saved to App User List. Please try again.`;
}

export function MongoSaveErrorDialog({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <Portal>
      <Dialog visible={Boolean(message)} onDismiss={onDismiss}>
        <Dialog.Title>App User List not saved</Dialog.Title>
        <Dialog.Content>
          <Text>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>OK</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
