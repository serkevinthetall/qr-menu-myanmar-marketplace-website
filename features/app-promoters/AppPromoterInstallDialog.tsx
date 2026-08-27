/** App Promoter picker for install Request / Mark Installed. */
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Dialog, Portal, Text } from 'react-native-paper';

import { DropdownField } from '@/components/ui/DropdownField';

type AppPromoterInstallDialogProps = {
  visible: boolean;
  contactName?: string;
  promoterNames: string[];
  loadingPromoters?: boolean;
  busy?: boolean;
  /** Pre-select when the contact already has a promoter. */
  initialValue?: string;
  confirmLabel?: string;
  helpText?: string;
  onDismiss: () => void;
  onConfirm: (appPromoter: string) => void;
};

export function AppPromoterInstallDialog({
  visible,
  contactName,
  promoterNames,
  loadingPromoters = false,
  busy = false,
  initialValue = '',
  confirmLabel = 'Mark installed',
  helpText,
  onDismiss,
  onConfirm,
}: AppPromoterInstallDialogProps) {
  const [selected, setSelected] = useState('');

  const options = useMemo(
    () => [...promoterNames].sort((a, b) => a.localeCompare(b)),
    [promoterNames],
  );

  useEffect(() => {
    if (!visible) {
      setSelected('');
      return;
    }
    const initial = initialValue.trim();
    if (initial && options.includes(initial)) {
      setSelected(initial);
      return;
    }
    if (options.length === 1) {
      setSelected(options[0]);
    }
  }, [visible, options, initialValue]);

  const canConfirm = Boolean(selected.trim()) && !busy && !loadingPromoters;

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>App Promoter</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.help}>
            {helpText ||
              `Choose who promoted the app for ${contactName || 'this contact'}.`}
          </Text>
          {loadingPromoters ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Loading promoters…</Text>
            </View>
          ) : options.length === 0 ? (
            <Text style={styles.empty}>
              No App Promoters yet. Add names under App List → App Promoter.
            </Text>
          ) : (
            <DropdownField
              label="App Promoter"
              value={selected}
              options={options}
              onChange={setSelected}
              placeholder="Select promoter"
              showClearOption={false}
              sortOptions={false}
            />
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={busy}>
            Cancel
          </Button>
          <Button
            mode="contained"
            disabled={!canConfirm || options.length === 0}
            loading={busy}
            onPress={() => {
              const name = selected.trim();
              if (!name) return;
              onConfirm(name);
            }}>
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  help: {
    marginBottom: 12,
    opacity: 0.75,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  loadingText: {
    opacity: 0.75,
  },
  empty: {
    opacity: 0.75,
  },
});
