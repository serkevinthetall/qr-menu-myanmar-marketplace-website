import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  FAB,
  IconButton,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';

import { QuotationDetailView } from '@/components/quotation/QuotationDetailView';
import { QuotationPrintPreview } from '@/components/quotation/QuotationPrintPreview';
import { canCancelQuotation } from '@/constants/status-colors';
import { useAuth } from '@/contexts/auth-context';
import {
  cancelAppQuotation,
  fetchAppQuotationDetail,
} from '@/services/app/quotations';
import { QuotationDetail } from '@/types/quotation';

export default function AppQuotationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const navigation = useNavigation();
  const { session } = useAuth();
  const router = useRouter();
  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printPromptVisible, setPrintPromptVisible] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirmVisible, setCancelConfirmVisible] = useState(false);

  const load = useCallback(async () => {
    if (!session?.token || !id) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchAppQuotationDetail(session.token, id);
      setDetail(data);
    } catch (err) {
      setDetail(null);
      setError(err instanceof Error ? err.message : 'Failed to load quotation.');
    } finally {
      setLoading(false);
    }
  }, [session?.token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = useCallback(async () => {
    if (!session?.token || !id) return;
    setCancelling(true);
    try {
      const updated = await cancelAppQuotation(session.token, id);
      setDetail(updated);
      setCancelConfirmVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel quotation.');
    } finally {
      setCancelling(false);
    }
  }, [session?.token, id]);

  useLayoutEffect(() => {
    const showCancel = detail ? canCancelQuotation(detail.status) : false;
    navigation.setOptions({
      headerRight: showCancel
        ? () => (
            <IconButton
              icon="cancel"
              iconColor={theme.colors.onPrimary}
              disabled={cancelling}
              onPress={() => setCancelConfirmVisible(true)}
              accessibilityLabel="Cancel quotation"
            />
          )
        : undefined,
    });
  }, [navigation, detail, cancelling, theme.colors.onPrimary]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <QuotationDetailView
        detail={detail}
        loading={loading}
        error={error}
        onBack={() => router.back()}
        contentBottomInset={88}
      />

      <Portal>
        <Dialog
          visible={printPromptVisible}
          onDismiss={() => setPrintPromptVisible(false)}>
          <Dialog.Title>Print quotation?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Do you want to print quotation {detail?.number ?? ''} on thermal
              paper?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPrintPromptVisible(false)}>No</Button>
            <Button
              mode="contained"
              onPress={() => {
                setPrintPromptVisible(false);
                setShowPrintPreview(true);
              }}>
              Yes
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={cancelConfirmVisible}
          onDismiss={() => (cancelling ? undefined : setCancelConfirmVisible(false))}>
          <Dialog.Title>Cancel quotation?</Dialog.Title>
          <Dialog.Content>
            <Text>
              Cancel {detail?.number ?? 'this quotation'}? This cannot be undone
              from here.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              disabled={cancelling}
              onPress={() => setCancelConfirmVisible(false)}>
              Keep
            </Button>
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              loading={cancelling}
              disabled={cancelling}
              onPress={() => {
                void handleCancel();
              }}>
              Cancel quotation
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {showPrintPreview && detail ? (
        <QuotationPrintPreview
          detail={detail}
          format="thermal"
          onClose={() => setShowPrintPreview(false)}
        />
      ) : null}

      {detail && !loading && !error ? (
        <FAB
          icon="printer-pos"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={() => setPrintPromptVisible(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 20,
  },
});
