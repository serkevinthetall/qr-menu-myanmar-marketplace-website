import { createElement, useCallback, useMemo, useRef, useState, type RefObject } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { useAppColors } from '@/hooks/use-app-colors';
import { useResponsive } from '@/hooks/use-responsive';
import { QuotationDetail } from '@/types/quotation';
import {
  buildPrintHtml,
  printHtml,
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
  const background =
    format === 'thermal' ? colors.printThermalBg : colors.printPreviewBg;

  if (Platform.OS === 'web') {
    return createElement('iframe', {
      ref: iframeRef,
      srcDoc: html,
      title: `Print preview ${format}`,
      style: {
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        background,
      },
    });
  }

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={[styles.webView, { backgroundColor: background }]}
      startInLoadingState
      renderLoading={() => (
        <View style={[styles.webViewLoading, { backgroundColor: background }]}>
          <ActivityIndicator />
        </View>
      )}
      setSupportMultipleWindows={false}
      javaScriptEnabled
      scalesPageToFit
    />
  );
}

export function QuotationPrintPreview({
  detail,
  format,
  onClose,
}: QuotationPrintPreviewProps) {
  const theme = useTheme();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const { isMobile } = useResponsive();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [printing, setPrinting] = useState(false);
  const html = useMemo(
    () => buildPrintHtml(detail, format),
    [detail, format],
  );

  const handlePrint = useCallback(async () => {
    setPrinting(true);
    try {
      if (Platform.OS === 'web') {
        const frameWindow = iframeRef.current?.contentWindow;
        if (frameWindow) {
          frameWindow.focus();
          frameWindow.print();
          return;
        }
      }
      const ok = await printHtml(html);
      if (!ok) {
        // Keep preview open; user can retry.
      }
    } finally {
      setPrinting(false);
    }
  }, [html]);

  const formatLabel = format === 'a4' ? 'A4' : 'Thermal (80mm)';
  const printLabel = format === 'thermal' ? 'PRINT THERMAL' : 'PRINT DOCUMENT';

  return (
    <View
      style={[
        styles.overlay,
        {
          backgroundColor: colors.printOverlay,
          paddingTop: insets.top > 0 ? 0 : undefined,
        },
      ]}>
      <View
        style={[
          styles.toolbar,
          isMobile && styles.toolbarMobile,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.outlineVariant ?? theme.colors.outline,
          },
        ]}>
        <View style={[styles.toolbarLeft, isMobile && styles.toolbarLeftMobile]}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
            <Icon source="close" size={22} />
          </Pressable>
          <Icon source="printer" size={20} color={theme.colors.primary} />
          <Text
            variant={isMobile ? 'titleSmall' : 'titleMedium'}
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.toolbarTitle}>
            {isMobile ? detail.number : `Print Preview — ${detail.number}`}
          </Text>
          <View
            style={[
              styles.formatChip,
              { backgroundColor: theme.colors.primaryContainer },
            ]}>
            <Text
              variant="labelSmall"
              numberOfLines={1}
              style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {formatLabel}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => {
            void handlePrint();
          }}
          disabled={printing}
          style={({ pressed }) => [
            styles.printBtn,
            isMobile && styles.printBtnMobile,
            { backgroundColor: theme.colors.primary },
            (pressed || printing) && { opacity: 0.88 },
          ]}>
          <Text style={[styles.printBtnText, { color: theme.colors.onPrimary }]}>
            {printing ? 'PRINTING…' : printLabel}
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
  },
  toolbarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 10,
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  toolbarLeftMobile: {
    flex: 0,
    width: '100%',
  },
  closeBtn: {
    padding: 4,
  },
  toolbarTitle: {
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
  },
  formatChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexShrink: 0,
  },
  printBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    flexShrink: 0,
  },
  printBtnMobile: {
    width: '100%',
    alignItems: 'center',
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
  webView: {
    flex: 1,
    width: '100%',
  },
  webViewLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
