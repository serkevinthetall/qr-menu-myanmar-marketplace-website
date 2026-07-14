import { createElement, useCallback, useMemo, useRef, type RefObject } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import { useAppColors } from '@/hooks/use-app-colors';
import { useResponsive } from '@/hooks/use-responsive';
import { QuotationDetail } from '@/types/quotation';
import {
  buildPrintHtml,
  printHtmlDocument,
  PrintFormat,
} from '@/utils/print-quotation';

type QuotationPrintPreviewProps = {
  detail: QuotationDetail;
  format: PrintFormat;
  onClose: () => void;
};

function PreviewFrame({
  html,
  format,
  iframeRef,
}: {
  html: string;
  format: PrintFormat;
  iframeRef: RefObject<HTMLIFrameElement | null>;
}) {
  const colors = useAppColors();

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.unsupported}>
        <Text>Print preview is only available on web.</Text>
      </View>
    );
  }

  return createElement('iframe', {
    ref: iframeRef,
    srcDoc: html,
    title: `Print preview ${format}`,
    style: {
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      background:
        format === 'thermal' ? colors.printThermalBg : colors.printPreviewBg,
    },
  });
}

export function QuotationPrintPreview({
  detail,
  format,
  onClose,
}: QuotationPrintPreviewProps) {
  const theme = useTheme();
  const colors = useAppColors();
  const { isMobile } = useResponsive();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const html = useMemo(
    () => buildPrintHtml(detail, format),
    [detail, format],
  );

  const handlePrint = useCallback(() => {
    const frameWindow = iframeRef.current?.contentWindow;
    if (frameWindow) {
      frameWindow.focus();
      frameWindow.print();
      return;
    }
    printHtmlDocument(html);
  }, [html]);

  const formatLabel = format === 'a4' ? 'A4' : 'Thermal (80mm)';

  return (
    <View style={[styles.overlay, { backgroundColor: colors.printOverlay }]}>
      <View
        style={[
          styles.toolbar,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <View style={styles.toolbarLeft}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Icon source="close" size={22} />
          </Pressable>
          <Icon source="printer" size={20} color={theme.colors.primary} />
          <Text variant="titleMedium" style={styles.toolbarTitle}>
            Print Preview — {detail.number}
          </Text>
          <View
            style={[
              styles.formatChip,
              { backgroundColor: theme.colors.primaryContainer },
            ]}>
            <Text
              variant="labelSmall"
              style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {formatLabel}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handlePrint}
          style={({ pressed }) => [
            styles.printBtn,
            { backgroundColor: theme.colors.primary },
            pressed && { opacity: 0.88 },
          ]}>
          <Text style={[styles.printBtnText, { color: theme.colors.onPrimary }]}>
            PRINT DOCUMENT
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.previewArea,
          { backgroundColor: colors.printPreviewBg },
          format === 'thermal' && { backgroundColor: colors.printThermalBg },
        ]}>
        <View
          style={[
            styles.previewFrame,
            format === 'thermal'
              ? isMobile
                ? styles.previewFrameThermalMobile
                : styles.previewFrameThermal
              : styles.previewFrameA4,
          ]}>
          <PreviewFrame html={html} format={format} iframeRef={iframeRef} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
    flexWrap: 'wrap',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  closeBtn: {
    padding: 4,
  },
  toolbarTitle: {
    fontWeight: '700',
    flexShrink: 1,
  },
  formatChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  printBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
  },
  printBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 16,
  },
  previewFrame: {
    flex: 1,
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  previewFrameA4: {
    maxWidth: 900,
  },
  previewFrameThermal: {
    maxWidth: 340,
  },
  previewFrameThermalMobile: {
    maxWidth: '100%',
  },
  unsupported: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
