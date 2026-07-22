import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { getPurchaseOrderStatusColors } from '@/constants/status-colors';
import { useAppTheme } from '@/contexts/theme-context';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import {
  PurchaseOrderDetail,
  PurchaseOrderLine,
} from '@/types/purchase-order';
import {
  formatMyanmarDate,
  formatMyanmarDateTime,
} from '@/utils/myanmar-datetime';

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} MMK`;
}

function SurfaceCard({
  children,
  noPadding,
}: {
  children: ReactNode;
  noPadding?: boolean;
}) {
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
        noPadding ? null : styles.surfaceCardPad,
      ]}>
      {children}
    </View>
  );
}

function MetaTile({
  icon,
  label,
  value,
  emphasize,
}: {
  icon: string;
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const display = value?.trim() || '—';

  return (
    <View
      style={[
        styles.metaTile,
        {
          backgroundColor: detail.panelBg,
          borderColor: detail.border,
        },
      ]}>
      <View
        style={[
          styles.metaTileIcon,
          { backgroundColor: theme.colors.primaryContainer },
        ]}>
        <Icon source={icon} size={18} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[styles.metaLabel, { color: detail.label }]}>{label}</Text>
        {emphasize ? (
          <CustomerNameText
            size="body"
            style={{ fontWeight: '700', color: theme.colors.primary }}
            numberOfLines={2}>
            {display}
          </CustomerNameText>
        ) : (
          <Text
            style={[styles.metaValue, { color: detail.onSurface }]}
            numberOfLines={2}>
            {display}
          </Text>
        )}
      </View>
    </View>
  );
}

function StatusPill({ status }: { status: string }) {
  const { mode } = useAppTheme();
  const { label, bg, fg } = getPurchaseOrderStatusColors(mode, status);

  return (
    <View style={[styles.statusPill, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

function LinesTable({
  lines,
  compact,
}: {
  lines: PurchaseOrderLine[];
  compact: boolean;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();

  if (compact) {
    return (
      <View style={styles.mobileLines}>
        {lines.map((line, index) => {
          const qty = line.quantity.toLocaleString('en-US', {
            maximumFractionDigits: 2,
          });
          return (
            <View
              key={line.id}
              style={[
                styles.mobileLineCard,
                {
                  backgroundColor: detail.surface,
                  borderColor: detail.border,
                },
              ]}>
              <View
                style={[
                  styles.mobileLineIndex,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 11 }}>
                  {index + 1}
                </Text>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <CustomerNameText
                  size="body"
                  style={{ color: detail.onSurface, fontWeight: '700' }}
                  numberOfLines={3}>
                  {line.product}
                </CustomerNameText>
                <Text style={{ color: detail.label, fontSize: 12 }}>
                  {qty} {line.unit || 'Units'} × {formatMoney(line.unitPrice)}
                </Text>
                <Text
                  style={{
                    color: theme.colors.primary,
                    fontWeight: '800',
                    fontSize: 14,
                    alignSelf: 'flex-end',
                  }}>
                  {formatMoney(line.amount)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

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
        <View style={styles.lineColIndex}>
          <Text style={[styles.headerText, { color: detail.label }]}>#</Text>
        </View>
        <View style={styles.lineColProduct}>
          <Text style={[styles.headerText, { color: detail.label }]}>PRODUCT</Text>
        </View>
        <View style={styles.lineColQty}>
          <Text style={[styles.headerText, styles.right, { color: detail.label }]}>
            QTY
          </Text>
        </View>
        <View style={styles.lineColUnit}>
          <Text style={[styles.headerText, styles.center, { color: detail.label }]}>
            UOM
          </Text>
        </View>
        <View style={styles.lineColPrice}>
          <Text style={[styles.headerText, styles.right, { color: detail.label }]}>
            UNIT PRICE
          </Text>
        </View>
        <View style={styles.lineColAmount}>
          <Text style={[styles.headerText, styles.right, { color: detail.label }]}>
            AMOUNT
          </Text>
        </View>
      </View>

      {lines.map((line, index) => {
        const zebra = index % 2 === 1;
        return (
          <View
            key={line.id}
            style={[
              styles.lineRow,
              {
                backgroundColor: zebra ? detail.panelBg : detail.surface,
                borderBottomColor: detail.border,
              },
            ]}>
            <View style={styles.lineColIndex}>
              <Text style={{ color: detail.label, fontWeight: '700', fontSize: 12 }}>
                {index + 1}
              </Text>
            </View>
            <View style={styles.lineColProduct}>
              <Text
                style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}
                numberOfLines={2}>
                {line.product || '—'}
              </Text>
            </View>
            <View style={styles.lineColQty}>
              <Text style={[styles.cell, styles.right, { color: detail.onSurface }]}>
                {line.quantity.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.lineColUnit}>
              <Text style={[styles.cell, styles.center, { color: detail.label }]}>
                {line.unit || 'Units'}
              </Text>
            </View>
            <View style={styles.lineColPrice}>
              <Text style={[styles.cell, styles.right, { color: detail.onSurface }]}>
                {formatMoney(line.unitPrice)}
              </Text>
            </View>
            <View style={styles.lineColAmount}>
              <Text
                style={[
                  styles.cell,
                  styles.right,
                  { color: theme.colors.primary, fontWeight: '800' },
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

type PurchaseOrderDetailViewProps = {
  detail: PurchaseOrderDetail | null;
  loading: boolean;
  error: string;
};

export function PurchaseOrderDetailView({
  detail,
  loading,
  error,
}: PurchaseOrderDetailViewProps) {
  const theme = useTheme();
  const detailTheme = useDetailTheme();
  const { width } = useResponsive();
  const isMobile = width < 768;

  const untaxed =
    detail && detail.untaxedAmount > 0
      ? detail.untaxedAmount
      : detail?.lines.reduce((sum, line) => sum + line.amount, 0) ?? 0;

  // Keep showing the preview header while lines/full detail finish loading.
  if (error && !detail) {
    return (
      <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
        <View style={styles.center}>
          <Text
            variant="titleMedium"
            style={{ fontWeight: '600', marginBottom: 8, color: theme.colors.onSurface }}>
            Could not load purchase order
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  if (loading && !detail) {
    return (
      <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Loading purchase order from Odoo...
          </Text>
        </View>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
        <View style={styles.center}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Purchase order not found.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isMobile ? styles.padMobile : styles.padDesktop,
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.page}>
          {loading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" />
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
                Refreshing details from Odoo...
              </Text>
            </View>
          ) : null}
          {error ? (
            <Text style={{ color: theme.colors.error, paddingHorizontal: 4 }}>{error}</Text>
          ) : null}

          <SurfaceCard noPadding>
            <View
              style={[
                styles.hero,
                { backgroundColor: theme.colors.primary },
              ]}>
              <View style={styles.heroTop}>
                <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                  <Text style={styles.heroEyebrow}>PURCHASE ORDER</Text>
                  <Text style={styles.heroNumber} numberOfLines={1}>
                    {detail.number || '—'}
                  </Text>
                  <CustomerNameText
                    size="body"
                    style={{ color: 'rgba(255,255,255,0.92)', fontWeight: '600' }}
                    numberOfLines={2}>
                    {detail.vendor?.trim() || 'No vendor'}
                  </CustomerNameText>
                </View>
                <StatusPill status={detail.status} />
              </View>

              <View style={styles.heroBottom}>
                <View>
                  <Text style={styles.heroMuted}>Total</Text>
                  <Text style={styles.heroTotal}>{formatMoney(detail.total)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.heroMuted}>
                    {detail.lines.length} line{detail.lines.length === 1 ? '' : 's'}
                  </Text>
                  {detail.currency ? (
                    <Text style={styles.heroCurrency}>{detail.currency}</Text>
                  ) : null}
                </View>
              </View>
            </View>
          </SurfaceCard>

          <View style={[styles.metaGrid, isMobile && styles.metaGridStack]}>
            <MetaTile
              icon="account-tie-outline"
              label="BUYER"
              value={detail.buyer}
            />
            <MetaTile
              icon="calendar"
              label="ORDER DATE"
              value={formatMyanmarDateTime(detail.orderDate) || detail.orderDate}
            />
            <MetaTile
              icon="calendar-clock"
              label="SCHEDULED"
              value={formatMyanmarDate(detail.scheduledDate) || detail.scheduledDate}
            />
            <MetaTile
              icon="source-branch"
              label="ORIGIN"
              value={detail.origin}
              emphasize={!!detail.origin}
            />
          </View>

          <SurfaceCard noPadding>
            <View
              style={[
                styles.sectionBar,
                { borderBottomColor: detailTheme.border },
              ]}>
              <View style={styles.sectionBarLeft}>
                <Icon source="format-list-bulleted" size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: detailTheme.onSurface }]}>
                  Order lines
                </Text>
              </View>
              <View
                style={[
                  styles.countChip,
                  { backgroundColor: detailTheme.panelBg, borderColor: detailTheme.border },
                ]}>
                <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>
                  {detail.lines.length}
                </Text>
              </View>
            </View>

            <View style={styles.sectionBody}>
              {loading && detail.lines.length === 0 ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator size="small" />
                  <Text style={{ color: detailTheme.label, fontSize: 13 }}>
                    Loading order lines...
                  </Text>
                </View>
              ) : detail.lines.length === 0 ? (
                <Text style={{ textAlign: 'center', color: detailTheme.label, paddingVertical: 24 }}>
                  No order lines.
                </Text>
              ) : (
                <LinesTable lines={detail.lines} compact={isMobile} />
              )}
            </View>
          </SurfaceCard>

          <View style={[styles.totalsWrap, isMobile && { alignSelf: 'stretch' }]}>
            <View
              style={[
                styles.totalsCard,
                {
                  backgroundColor: detailTheme.surface,
                  borderColor: detailTheme.border,
                  shadowColor: detailTheme.shadow,
                },
              ]}>
              <View style={styles.totalRow}>
                <Text style={{ color: detailTheme.label, fontWeight: '600' }}>Untaxed amount</Text>
                <Text style={{ color: detailTheme.onSurface, fontWeight: '700' }}>
                  {formatMoney(untaxed)}
                </Text>
              </View>
              <View
                style={[
                  styles.totalDivider,
                  { backgroundColor: detailTheme.accentDivider },
                ]}
              />
              <View style={styles.totalRow}>
                <Text style={{ color: detailTheme.onSurface, fontWeight: '800', fontSize: 15 }}>
                  Total
                </Text>
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 18 }}>
                  {formatMoney(detail.total)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 32,
  },
  padMobile: { paddingHorizontal: 12, paddingTop: 12 },
  padDesktop: { paddingHorizontal: 24, paddingTop: 16 },
  page: {
    width: '100%',
    maxWidth: 1100,
    gap: 14,
  },
  surfaceCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  surfaceCardPad: { padding: 16 },
  hero: {
    padding: 20,
    gap: 18,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroNumber: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.25)',
    paddingTop: 14,
  },
  heroMuted: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  heroTotal: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  heroCurrency: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaGridStack: {
    flexDirection: 'column',
  },
  metaTile: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  metaTileIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sectionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  countChip: {
    minWidth: 28,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  sectionBody: {
    padding: 16,
  },
  mobileLines: { gap: 10 },
  mobileLineCard: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  mobileLineIndex: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  linesTable: {
    borderWidth: 1,
    borderRadius: 8,
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
  cell: { fontSize: 12, lineHeight: 16 },
  right: { textAlign: 'right' },
  center: { textAlign: 'center' },
  lineColIndex: { width: 28 },
  lineColProduct: { flex: 2.4, minWidth: 0 },
  lineColQty: { flex: 0.75, minWidth: 0 },
  lineColUnit: { flex: 0.7, minWidth: 0 },
  lineColPrice: { flex: 1.15, minWidth: 0 },
  lineColAmount: { flex: 1.15, minWidth: 0 },
  totalsWrap: {
    alignSelf: 'flex-end',
    width: 340,
    maxWidth: '100%',
  },
  totalsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  totalDivider: { height: StyleSheet.hairlineWidth },
});
