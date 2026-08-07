/** @temp-feature app-install-call-list */
import { Pressable, StyleSheet } from 'react-native';
import { Button, Dialog, Portal, Text, useTheme } from 'react-native-paper';

import { APP_INSTALL_REASON_OPTIONS, AppInstallReason } from './types';

export function NotInstalledReasonDialog({
  visible,
  onDismiss,
  onSelect,
}: {
  visible: boolean;
  onDismiss: () => void;
  onSelect: (reason: AppInstallReason) => void;
}) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Why not installed?</Dialog.Title>
        <Dialog.Content>
          {APP_INSTALL_REASON_OPTIONS.map(opt => (
            <Pressable
              key={opt.id}
              onPress={() => onSelect(opt.id)}
              style={{
                paddingVertical: 12,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.outlineVariant,
              }}>
              <Text style={{ fontWeight: '600' }}>{opt.label}</Text>
            </Pressable>
          ))}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
