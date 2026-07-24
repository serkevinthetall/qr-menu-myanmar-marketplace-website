import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  Button,
  IconButton,
  Modal,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';

type DismissibleModalProps = {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  children: ReactNode;
  /** Extra actions below the body (besides the default Close). */
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  dismissable?: boolean;
  /** Show bottom Close text button. Default true. */
  showCloseButton?: boolean;
};

/**
 * Paper Modal wrapper that always allows leaving:
 * - dismissable backdrop (when enabled)
 * - header X button
 * - optional Close button
 * Avoids full-screen flex:1 content hosts that swallow outside taps.
 */
export function DismissibleModal({
  visible,
  onDismiss,
  title,
  children,
  footer,
  contentContainerStyle,
  dismissable = true,
  showCloseButton = true,
}: DismissibleModalProps) {
  const theme = useTheme();

  return (
    <Portal>
      <Modal
        visible={visible}
        dismissable={dismissable}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modal,
          { backgroundColor: theme.colors.surface },
          contentContainerStyle,
        ]}>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>
            {title}
          </Text>
          <IconButton
            icon="close"
            size={20}
            onPress={onDismiss}
            disabled={!dismissable}
            accessibilityLabel="Close"
          />
        </View>
        {children}
        {footer}
        {showCloseButton ? (
          <Button mode="text" onPress={onDismiss} style={styles.closeBtn}>
            Close
          </Button>
        ) : null}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 16,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    paddingTop: 4,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginTop: 4,
  },
});
