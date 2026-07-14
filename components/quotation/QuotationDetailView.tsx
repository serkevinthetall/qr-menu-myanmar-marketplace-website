import { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Checkbox, Icon, Text, useTheme } from 'react-native-paper';

import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { QuotationDetail, QuotationLine, QuotationReorderSeed } from '@/types/quotation';

type DetailTab = 'lines' | 'other';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

function formatDate(value: string): string {
  if (!value?.trim()) {
    return '';
  }
  const datePart = value.trim().split(/[T ]/)[0];
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) {
    return value.trim();
  }

  const now = new Date();
  const sameYear = year === now.getFullYear();
  return sameYear
    ? `${MONTHS[month - 1]} ${day}`
    : `${MONTHS[month - 1]} ${day}, ${year}`;
}

function formatDateTime(value: string): string {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (/AM|PM/i.test(trimmed)) {
    return trimmed;
  }

  const normalized = trimmed.replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '');
  const [datePart, timePart = ''] = normalized.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  if (!year || !month || !day) {
    return trimmed;
  }

  const now = new Date();
  const sameYear = year === now.getFullYear();
  const dateLabel = sameYear
    ? `${MONTHS[month - 1]} ${day}`
    : `${MONTHS[month - 1]} ${day}, ${year}`;

  if (!timePart || timePart.startsWith('00:00:00')) {
    return dateLabel;
  }

  const [hourRaw, minuteRaw] = timePart.split(':').map(Number);
  const hours = Number.isFinite(hourRaw) ? hourRaw : 0;
  const minutes = Number.isFinite(minuteRaw) ? minuteRaw : 0;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  return `${dateLabel} ${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function SurfaceCard({ children }: { children: ReactNode }) {
  const detail = useDetailTheme();

  return (
    <View
      style={[
        styles.surfaceCard,
        {
          backgroundColor: detail.surface,
          borderColor: detail.border,
          shadowColor: detail.shadow,
        },
      ]}>
      {children}
    </View>
  );
}

function MetaField({
  label,
  value,
  link = false,
  showEmpty = false,
}: {
  label: string;
  value: string;
  link?: boolean;
  showEmpty?: boolean;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const display = value?.trim();

  if (!display && !showEmpty) {
    return null;
  }

  return (
    <View style={styles.metaField}>
      <Text style={[styles.metaLabel, { color: detail.label }]}>{label}</Text>
      <Text
        style={[
          styles.metaValue,
          {
            color: display
              ? link
                ? theme.colors.primary
                : detail.onSurface
              : detail.label,
          },
          link && display ? styles.metaLink : undefined,
        ]}
        numberOfLines={3}>
        {display || '—'}
      </Text>
    </View>
  );
}

function DetailTabs({
  tab,
  onChange,
  lineCount,
  reorderMode,
  selectedCount,
  onReorderPress,
  onConfirmReorder,
  onCancelReorder,
}: {
  tab: DetailTab;
  onChange: (tab: DetailTab) => void;
  lineCount: number;
  reorderMode: boolean;
  selectedCount: number;
  onReorderPress: () => void;
  onConfirmReorder: () => void;
  onCancelReorder: () => void;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();

  return (
    <View style={[styles.tabBarRow, { borderBottomColor: detail.border }]}>
      <View style={styles.tabBar}>
        {(
          [
            { key: 'lines' as const, label: 'Order Lines' },
            { key: 'other' as const, label: 'Other Info' },
          ] as const
        ).map(item => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              style={[styles.tab, active && { borderBottomColor: theme.colors.primary }]}>
              <Text
                style={[
                  styles.tabText,
                  {
                    color: active ? theme.colors.primary : detail.label,
                    fontWeight: active ? '700' : '600',
                  },
                ]}>
                {item.label.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'lines' && lineCount > 0 ? (
        <View style={styles.tabActions}>
          {reorderMode ? (
            <>
              <Button compact mode="text" onPress={onCancelReorder}>
                Cancel
              </Button>
              <Button
                compact
                mode="text"
                disabled={selectedCount === 0}
                onPress={onConfirmReorder}>
                New Quotation ({selectedCount})
              </Button>
            </>
          ) : (
            <Button compact mode="outlined" icon="refresh" onPress={onReorderPress}>
              Reorder
            </Button>
          )}
        </View>
      ) : null}
    </View>
  );
}

function LinesTable({
  lines,
  selectionMode = false,
  selectedIds,
  onToggleLine,
}: {
  lines: QuotationLine[];
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleLine?: (lineId: string) => void;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();

  return (
    <View style={[styles.linesTable, { borderColor: detail.border }]}>
      <View
        style={[
          styles.lineHeader,
          {
            backgroundColor: detail.headerBg,
            borderBottomColor: detail.border,
          },
        ]}>
        {selectionMode ? <View style={styles.lineColSelect} /> : null}
        <View style={styles.lineColProduct}>
          <Text style={[styles.headerText, { color: detail.label }]}>PRODUCT</Text>
        </View>
        <View style={styles.lineColQty}>
          <Text style={[styles.headerText, styles.cellTextRight, { color: detail.label }]}>
            QUANTITY
          </Text>
        </View>
        <View style={styles.lineColUnit}>
          <Text style={[styles.headerText, styles.cellTextCenter, { color: detail.label }]}>
            UNIT
          </Text>
        </View>
        <View style={styles.lineColPrice}>
          <Text style={[styles.headerText, styles.cellTextRight, { color: detail.label }]}>
            UNIT PRICE
          </Text>
        </View>
        <View style={styles.lineColTaxes}>
          <Text style={[styles.headerText, styles.cellTextCenter, { color: detail.label }]}>
            TAXES
          </Text>
        </View>
        <View style={styles.lineColDisc}>
          <Text style={[styles.headerText, styles.cellTextRight, { color: detail.label }]}>
            DISC.%
          </Text>
        </View>
        <View style={styles.lineColAmount}>
          <Text style={[styles.headerText, styles.cellTextRight, { color: detail.label }]}>
            AMOUNT
          </Text>
        </View>
      </View>

      {lines.map(line => {
        const selected = selectedIds?.has(line.id) ?? false;
        return (
        <View
          key={line.id}
          style={[
            styles.lineRow,
            {
              backgroundColor: detail.surface,
              borderBottomColor: detail.border,
            },
            selectionMode && !selected ? styles.lineRowUnselected : null,
          ]}>
          {selectionMode ? (
            <View style={styles.lineColSelect}>
              <Checkbox
                status={selected ? 'checked' : 'unchecked'}
                onPress={() => onToggleLine?.(line.id)}
              />
            </View>
          ) : null}
          <View style={styles.lineColProduct}>
            <Text
              style={[styles.lineProductText, { color: theme.colors.primary }]}
              numberOfLines={2}>
              {line.product}
            </Text>
          </View>
          <View style={styles.lineColQty}>
            <Text style={[styles.lineCellText, styles.cellTextRight, { color: detail.cellText }]}>
              {line.quantity.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View style={styles.lineColUnit}>
            <Text
              style={[styles.lineCellText, styles.cellTextCenter, { color: detail.cellText }]}
              numberOfLines={1}>
              {line.unit || 'Units'}
            </Text>
          </View>
          <View style={styles.lineColPrice}>
            <Text
              style={[styles.lineCellText, styles.cellTextRight, { color: detail.cellText }]}
              numberOfLines={1}>
              {formatMoney(line.unitPrice)}
            </Text>
          </View>
          <View style={styles.lineColTaxes}>
            <Text style={[styles.lineCellText, styles.cellTextCenter, { color: detail.label }]}>
              —
            </Text>
          </View>
          <View style={styles.lineColDisc}>
            <Text style={[styles.lineCellText, styles.cellTextRight, { color: detail.cellText }]}>
              {line.discountPercent.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
          <View style={styles.lineColAmount}>
            <Text
              style={[
                styles.lineAmountText,
                styles.cellTextRight,
                { color: theme.colors.primary },
              ]}>
              {formatMoney(line.amount)}
            </Text>
          </View>
        </View>
        );
      })}
    </View>
  );
}

function DeliveryNotesCard({ notes }: { notes: string }) {
  const detail = useDetailTheme();

  return (
    <SurfaceCard>
      <View style={styles.noteCardBody}>
        <Text style={[styles.metaLabel, { color: detail.label }]}>DELIVERY NOTES</Text>
        <Text style={[styles.deliveryNoteText, { color: detail.cellText }]}>
          {notes.trim() || '—'}
        </Text>
      </View>
    </SurfaceCard>
  );
}

function TotalsCard({ untaxed, total }: { untaxed: number; total: number }) {
  const theme = useTheme();
  const detail = useDetailTheme();

  return (
    <SurfaceCard>
      <View style={styles.totalsBlock}>
        <View style={styles.totalLine}>
          <Text style={[styles.totalLabel, { color: detail.label }]}>Untaxed Amount</Text>
          <Text style={[styles.totalLineValue, { color: detail.cellText }]}>
            {formatMoney(untaxed)}
          </Text>
        </View>
        <View style={[styles.totalDivider, { backgroundColor: theme.colors.primary }]} />
        <View style={styles.totalLine}>
          <Text style={[styles.totalLabelBold, { color: detail.onSurface }]}>Total</Text>
          <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
            {formatMoney(total)}
          </Text>
        </View>
      </View>
    </SurfaceCard>
  );
}

type QuotationDetailViewProps = {
  detail: QuotationDetail | null;
  loading: boolean;
  error: string;
  onBack: () => void;
  onReorder?: (seed: QuotationReorderSeed) => void;
};

export function QuotationDetailView({
  detail,
  loading,
  error,
  onReorder,
}: QuotationDetailViewProps) {
  const theme = useTheme();
  const detailTheme = useDetailTheme();
  const { width } = useResponsive();
  const isMobile = width < 768;
  const [tab, setTab] = useState<DetailTab>('lines');
  const [reorderMode, setReorderMode] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setReorderMode(false);
    setSelectedLineIds(new Set());
  }, [detail?.id]);

  const handleTabChange = (next: DetailTab) => {
    setTab(next);
    if (next !== 'lines') {
      setReorderMode(false);
      setSelectedLineIds(new Set());
    }
  };

  const handleReorderPress = () => {
    if (!detail?.lines.length) {
      return;
    }
    setReorderMode(true);
    setSelectedLineIds(new Set(detail.lines.map(line => line.id)));
  };

  const handleToggleLine = (lineId: string) => {
    setSelectedLineIds(prev => {
      const next = new Set(prev);
      if (next.has(lineId)) {
        next.delete(lineId);
      } else {
        next.add(lineId);
      }
      return next;
    });
  };

  const handleConfirmReorder = () => {
    if (!detail || !onReorder || selectedLineIds.size === 0) {
      return;
    }

    const selectedLines = detail.lines.filter(line => selectedLineIds.has(line.id));
    onReorder({
      customerId: detail.customerId || undefined,
      phoneNumber: detail.phoneNumber,
      deliveryNote: detail.deliveryNotes,
      preferredDeliveryDate: detail.preferredDeliveryDate,
      paymentMethodLineId: detail.paymentMethodLineId || undefined,
      lines: selectedLines.map(line => ({
        lineId: line.id,
        productId: line.productId,
        productName: line.product,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountPercent: line.discountPercent,
      })),
    });
  };

  const untaxed =
    detail && detail.untaxedAmount > 0
      ? detail.untaxedAmount
      : detail?.lines.reduce((sum, line) => sum + line.amount, 0) ?? 0;

  return (
    <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Loading quotation from Odoo...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text
            variant="titleMedium"
            style={{ fontWeight: '600', marginBottom: 8, color: theme.colors.onSurface }}>
            Could not load quotation
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      ) : detail ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isMobile ? styles.scrollContentMobile : styles.scrollContentDesktop,
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.page}>
            <SurfaceCard>
              <View style={[styles.infoLayout, isMobile && styles.infoLayoutStack]}>
                <View style={styles.infoCol}>
                  <MetaField label="CUSTOMER" value={detail.customer} link />
                  <MetaField label="SALESPERSON" value={detail.salesperson} link />
                  <MetaField label="DELIVERY ADDRESS" value={detail.deliveryAddress} />
                </View>
                <View style={styles.infoCol}>
                  <MetaField
                    label="EXPIRATION"
                    value={formatDate(detail.expiration)}
                    showEmpty
                  />
                  <MetaField label="PRICELIST" value={detail.pricelist} showEmpty />
                  <MetaField
                    label="PREFERRED DELIVERY DATE"
                    value={formatDate(detail.preferredDeliveryDate)}
                    showEmpty
                  />
                </View>
                <View
                  style={[
                    styles.datePanel,
                    isMobile && styles.datePanelStack,
                    { backgroundColor: detailTheme.panelBg },
                  ]}>
                  <Text style={[styles.metaLabel, { color: detailTheme.label }]}>
                    QUOTATION DATE
                  </Text>
                  <View style={styles.dateRow}>
                    <Icon source="calendar" size={18} color={theme.colors.primary} />
                    <Text style={[styles.dateValue, { color: detailTheme.onSurface }]}>
                      {formatDateTime(detail.orderDate)}
                    </Text>
                  </View>
                  <View
                    style={[styles.infoDivider, { backgroundColor: detailTheme.accentDivider }]}
                  />
                  <View style={styles.sourceRow}>
                    <Text style={[styles.metaLabel, { color: detailTheme.label }]}>SOURCE</Text>
                    <Text style={[styles.sourceValue, { color: detailTheme.onSurface }]}>
                      Direct Sale
                    </Text>
                  </View>
                </View>
              </View>
            </SurfaceCard>

            <SurfaceCard>
              <DetailTabs
                tab={tab}
                onChange={handleTabChange}
                lineCount={detail.lines.length}
                reorderMode={reorderMode}
                selectedCount={selectedLineIds.size}
                onReorderPress={handleReorderPress}
                onConfirmReorder={handleConfirmReorder}
                onCancelReorder={() => {
                  setReorderMode(false);
                  setSelectedLineIds(new Set());
                }}
              />

              {tab === 'lines' ? (
                <View style={styles.tabPanel}>
                  {detail.lines.length === 0 ? (
                    <Text style={[styles.emptyLines, { color: detailTheme.label }]}>
                      No order lines.
                    </Text>
                  ) : (
                    <LinesTable
                      lines={detail.lines}
                      selectionMode={reorderMode}
                      selectedIds={selectedLineIds}
                      onToggleLine={handleToggleLine}
                    />
                  )}
                </View>
              ) : (
                <View style={styles.tabPanel}>
                  <View style={[styles.otherGrid, isMobile && styles.otherGridStack]}>
                    <MetaField
                      label="MEMBERSHIP COUPON STATUS"
                      value={detail.membershipCouponStatus}
                      showEmpty
                    />
                    <MetaField
                      label="MEMBERSHIP COUPON CODE"
                      value={detail.membershipCouponTicket}
                      showEmpty
                    />
                    <MetaField label="PHONENUMBER" value={detail.phoneNumber} showEmpty />
                    <MetaField label="PAYMENT METHOD" value={detail.paymentMethod} />
                    <MetaField label="PAYMENT TERMS" value={detail.paymentTerms} />
                    <MetaField label="INVOICE ADDRESS" value={detail.invoiceAddress} />
                  </View>
                </View>
              )}
            </SurfaceCard>

            <View style={[styles.footerRow, isMobile && styles.footerRowStack]}>
              <View style={styles.footerNotes}>
                <DeliveryNotesCard notes={detail.deliveryNotes} />
              </View>
              <View style={[styles.footerTotals, isMobile && styles.footerTotalsStack]}>
                <TotalsCard untaxed={untaxed} total={detail.total} />
              </View>
            </View>
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 28,
  },
  scrollContentMobile: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  scrollContentDesktop: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  page: {
    width: '100%',
    maxWidth: 1100,
    gap: 14,
  },
  surfaceCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  infoLayout: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 0,
    padding: 16,
  },
  infoLayoutStack: {
    flexDirection: 'column',
    gap: 14,
  },
  infoCol: {
    flex: 1,
    gap: 14,
    paddingRight: 12,
  },
  datePanel: {
    flex: 0.95,
    minWidth: 200,
    borderRadius: 6,
    padding: 14,
    gap: 8,
    justifyContent: 'center',
  },
  datePanelStack: {
    flex: 0,
    minWidth: 0,
  },
  metaField: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  metaLink: {
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 10,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sourceValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  tabBarRow: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tabBar: {
    flexDirection: 'row',
    flex: 1,
    flexWrap: 'wrap',
  },
  tabActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    gap: 4,
    paddingVertical: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  tabText: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
  tabPanel: {
    padding: 16,
    gap: 12,
  },
  emptyLines: {
    textAlign: 'center',
    opacity: 0.7,
    paddingVertical: 20,
    fontSize: 13,
  },
  linesTable: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 6,
    overflow: 'hidden',
  },
  lineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerText: {
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.4,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  lineRowUnselected: {
    opacity: 0.55,
  },
  lineProductText: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  lineCellText: {
    fontSize: 12,
    lineHeight: 16,
  },
  lineAmountText: {
    fontSize: 13,
    fontWeight: '800',
  },
  lineColSelect: {
    flexShrink: 0,
    justifyContent: 'center',
    width: 40,
  },
  lineColProduct: { flex: 2.2, minWidth: 0, justifyContent: 'center' },
  lineColQty: { flex: 0.75, minWidth: 0, justifyContent: 'center' },
  lineColUnit: { flex: 0.55, minWidth: 0, justifyContent: 'center' },
  lineColPrice: { flex: 1.1, minWidth: 0, justifyContent: 'center' },
  lineColTaxes: { flex: 0.45, minWidth: 0, justifyContent: 'center' },
  lineColDisc: { flex: 0.45, minWidth: 0, justifyContent: 'center' },
  lineColAmount: { flex: 1.1, minWidth: 0, justifyContent: 'center' },
  cellTextRight: { textAlign: 'right' },
  cellTextCenter: { textAlign: 'center' },
  otherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  otherGridStack: {
    flexDirection: 'column',
  },
  noteCardBody: {
    padding: 16,
    gap: 8,
    flex: 1,
  },
  deliveryNoteText: {
    fontSize: 14,
    lineHeight: 22,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  footerRowStack: {
    flexDirection: 'column',
  },
  footerNotes: {
    flex: 1,
    minWidth: 0,
  },
  footerTotals: {
    width: 300,
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  footerTotalsStack: {
    width: '100%',
  },
  totalsBlock: {
    padding: 16,
    gap: 8,
    minWidth: 260,
  },
  totalLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 24,
  },
  totalDivider: {
    height: 2,
    borderRadius: 1,
    marginVertical: 2,
  },
  totalLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  totalLabelBold: {
    fontSize: 14,
    fontWeight: '800',
  },
  totalLineValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
  },
});
