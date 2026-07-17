import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Divider,
  Text,
  useTheme,
} from 'react-native-paper';

import { getQuotationStatusColors } from '@/constants/status-colors';
import { useAuth } from '@/contexts/auth-context';
import { useAppTheme } from '@/contexts/theme-context';
import { fetchAppQuotationDetail } from '@/services/app/quotations';
import { QuotationDetail } from '@/types/quotation';
import { buildPrintHtml, printHtmlDocument } from '@/utils/print-quotation';

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function AppQuotationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { mode } = useAppTheme();
  const { session } = useAuth();
  const router = useRouter();
  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);

  const load = useCallback(async () => {
    if (!session?.token || !id) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchAppQuotationDetail(session.token, id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quotation.');
    } finally {
      setLoading(false);
    }
  }, [session?.token, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleThermalPrint = () => {
    if (!detail) return;
    setPrinting(true);
    try {
      if (Platform.OS === 'web') {
        const ok = printHtmlDocument(buildPrintHtml(detail, 'thermal'));
        if (!ok) {
          Alert.alert('Print failed', 'Could not open the print dialog.');
        }
      } else {
        // Native POS Bluetooth printing will hook here next.
        // For now show a clear receipt preview via alert summary.
        Alert.alert(
          'Thermal print',
          `${detail.number}\n${detail.customer}\nTotal: ${formatMoney(detail.total)} MMK\n\nBluetooth printer support for this handheld will be connected next. Receipt layout is ready.`,
        );
      }
    } finally {
      setPrinting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.center}>
        <Text style={{ color: theme.colors.error }}>{error || 'Not found'}</Text>
        <Button onPress={() => router.back()}>Back</Button>
      </View>
    );
  }

  const status = getQuotationStatusColors(mode, detail.status);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text variant="headlineSmall" style={styles.number}>
          {detail.number}
        </Text>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <Text style={{ color: status.fg, fontWeight: '700' }}>{status.label}</Text>
        </View>
      </View>

      <Text variant="titleMedium">{detail.customer}</Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {detail.phoneNumber || '—'}
      </Text>
      <Text variant="headlineSmall" style={styles.total}>
        {formatMoney(detail.total)} MMK
      </Text>

      <Divider style={styles.divider} />

      <Text variant="titleSmall" style={styles.section}>
        Order lines
      </Text>
      {detail.lines.map(line => (
        <View key={line.id} style={styles.line}>
          <Text style={{ flex: 1, fontWeight: '600' }}>{line.product}</Text>
          <Text>
            {line.quantity} × {formatMoney(line.amount)}
          </Text>
        </View>
      ))}

      <Divider style={styles.divider} />

      <Button
        mode="contained"
        icon="printer-pos"
        loading={printing}
        onPress={handleThermalPrint}
        style={styles.printBtn}>
        Print thermal
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  content: { padding: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  number: { fontWeight: '800', flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  total: { marginTop: 12, fontWeight: '800' },
  divider: { marginVertical: 16 },
  section: { fontWeight: '700', marginBottom: 8 },
  line: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  printBtn: { marginTop: 8 },
});
