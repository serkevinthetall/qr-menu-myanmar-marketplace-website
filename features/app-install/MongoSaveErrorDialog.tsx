/** @temp-feature app-install-call-list */
import { Button, Dialog, Portal, Text } from 'react-native-paper';

export function isMongoDatabaseErrorMessage(message: string): boolean {
  const text = message.trim();
  if (!text) {
    return false;
  }
  return (
    /mongo/i.test(text) ||
    /MONGODB_URI/i.test(text) ||
    /ServerSelectionError/i.test(text) ||
    /MongoNetworkError/i.test(text) ||
    /ECONNREFUSED/i.test(text) ||
    /timed? ?out/i.test(text) ||
    /failed to connect/i.test(text) ||
    /database is not/i.test(text) ||
    /not configured/i.test(text)
  );
}

/**
 * User-facing copy when App User List / Call List MongoDB fails (load or save).
 */
export function mongoSaveErrorMessage(err: unknown, action: string): string {
  const raw = err instanceof Error ? err.message.trim() : '';
  if (isMongoDatabaseErrorMessage(raw)) {
    return [
      'The App User List database could not be reached.',
      `${action} failed.`,
      '',
      raw,
    ].join('\n');
  }
  if (/failed to fetch/i.test(raw) || /could not reach/i.test(raw)) {
    return `Could not reach the server. ${action} failed for App User List.`;
  }
  if (raw) {
    return `${action} failed for App User List.\n\n${raw}`;
  }
  return `${action} failed for App User List. Please try again.`;
}

export function MongoSaveErrorDialog({
  message,
  onDismiss,
  title = 'Database not working',
}: {
  message: string;
  onDismiss: () => void;
  title?: string;
}) {
  return (
    <Portal>
      <Dialog visible={Boolean(message)} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
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
