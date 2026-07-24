import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { ThemeMode } from '@/constants/colors';
import { useAppTheme } from '@/contexts/theme-context';
import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { Membership } from '@/types/membership';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })} MMK`;
}

function getMembershipStatusColors(
  mode: ThemeMode,
  status: string,
): { label: string; bg: string; fg: string } {
  const value = status.trim().toLowerCase();
  const label = status.trim() || '—';

  if (mode === 'dark') {
    if (value.includes('active') || value.includes('running')) {
      return { label, bg: 'rgba(16, 185, 129, 0.95)', fg: '#064E3B' };
    }
    if (value.includes('expire') || value.includes('cancel') || value.includes('inactive')) {
      return { label, bg: 'rgba(254, 226, 226, 0.95)', fg: '#991B1B' };
    }
    if (value.includes('draft') || value.includes('pending')) {
      return { label, bg: 'rgba(226, 232, 240, 0.95)', fg: '#334155' };
    }
    return { label, bg: 'rgba(226, 232, 240, 0.95)', fg: '#334155' };
  }

  if (value.includes('active') || value.includes('running')) {
    return { label, bg: '#DCFCE7', fg: '#166534' };
  }
  if (value.includes('expire') || value.includes('cancel') || value.includes('inactive')) {
    return { label, bg: '#FEE2E2', fg: '#991B1B' };
  }
  if (value.includes('draft') || value.includes('pending')) {
    return { label, bg: '#E2E8F0', fg: '#475569' };
  }
  return { label, bg: '#E2E8F0', fg: '#475569' };
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
  useCustomerName,
}: {
  icon: string;
  label: string;
  value: string;
  emphasize?: boolean;
  useCustomerName?: boolean;
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
        {useCustomerName ? (
          <CustomerNameText
            size="body"
            style={{
              fontWeight: emphasize ? '800' : '700',
              color: emphasize ? theme.colors.primary : detail.onSurface,
            }}
            numberOfLines={2}>
            {display}
          </CustomerNameText>
        ) : (
          <Text
            style={[
              styles.metaValue,
              {
                color: emphasize ? theme.colors.primary : detail.onSurface,
                fontWeight: emphasize ? '800' : '700',
              },
            ]}
            numberOfLines={2}>
            {display}
          </Text>
        )}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const detail = useDetailTheme();
  const display = value?.trim();

  return (
    <View style={[styles.infoRow, { borderBottomColor: detail.border }]}>
      <Text style={[styles.infoLabel, { color: detail.label }]}>{label}</Text>
      <Text
        style={[
          styles.infoValue,
          { color: display ? detail.onSurface : detail.label },
        ]}
        numberOfLines={6}>
        {display || '—'}
      </Text>
    </View>
  );
}

function TicketStat({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();

  return (
    <View
      style={[
        styles.ticketStat,
        {
          backgroundColor: detail.panelBg,
          borderColor: detail.border,
        },
      ]}>
      <Text style={[styles.ticketLabel, { color: detail.label }]}>{label}</Text>
      <Text
        style={[
          styles.ticketValue,
          {
            color: emphasize ? theme.colors.primary : detail.onSurface,
          },
        ]}>
        {value}
      </Text>
    </View>
  );
}

type MembershipDetailViewProps = {
  detail: Membership | null;
  loading: boolean;
  error: string;
};

export function MembershipDetailView({
  detail,
  loading,
  error,
}: MembershipDetailViewProps) {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const detailTheme = useDetailTheme();
  const { width } = useResponsive();
  const isMobile = width < 768;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Loading membership from Odoo...
          </Text>
        </View>
      </View>
    );
  }

  if (error && !detail) {
    return (
      <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
        <View style={styles.centerOverlay}>
          <Text
            variant="titleMedium"
            style={{ fontWeight: '600', marginBottom: 8, color: theme.colors.onSurface }}>
            Could not load membership
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
        <View style={styles.centerOverlay}>
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Membership not found.</Text>
        </View>
      </View>
    );
  }

  const statusColors = getMembershipStatusColors(mode, detail.status);
  const start = formatMyanmarDate(detail.startDate) || detail.startDate || '—';
  const end = formatMyanmarDate(detail.endDate) || detail.endDate || '—';

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
          {error ? (
            <Text style={{ color: theme.colors.error, paddingHorizontal: 4 }}>{error}</Text>
          ) : null}

          <SurfaceCard noPadding>
            <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
              <View style={styles.heroTop}>
                <View
                  style={[
                    styles.heroIconWrap,
                    { backgroundColor: 'rgba(255,255,255,0.18)' },
                  ]}>
                  <Icon source="card-account-details-outline" size={32} color="#fff" />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <Text style={styles.heroEyebrow}>MEMBERSHIP</Text>
                  <Text style={styles.heroName} numberOfLines={3}>
                    {detail.name || '—'}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: statusColors.bg }]}>
                    <Text
                      style={{
                        color: statusColors.fg,
                        fontWeight: '700',
                        fontSize: 12,
                      }}>
                      {statusColors.label}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.heroBottom}>
                <View>
                  <Text style={styles.heroMuted}>Monthly coupon</Text>
                  <Text style={styles.heroTotal}>
                    {formatMoney(detail.monthlyCouponAmount)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.heroMuted}>Remaining tickets</Text>
                  <Text style={styles.heroStock}>{detail.remainingTickets}</Text>
                </View>
              </View>
            </View>
          </SurfaceCard>

          <View style={[styles.metaGrid, isMobile && styles.metaGridStack]}>
            <MetaTile
              icon="account-outline"
              label="CUSTOMER"
              value={detail.customer}
              emphasize
              useCustomerName
            />
            <MetaTile
              icon="star-circle-outline"
              label="LEVEL"
              value={detail.membershipLevel}
            />
            <MetaTile
              icon="tag-outline"
              label="PRICELIST"
              value={detail.pricelist}
            />
            <MetaTile
              icon="calendar-range"
              label="PERIOD"
              value={`${start} → ${end}`}
            />
          </View>

          <View style={[styles.ticketGrid, isMobile && styles.metaGridStack]}>
            <TicketStat label="TOTAL" value={String(detail.totalTickets)} />
            <TicketStat label="USED" value={String(detail.usedTickets)} />
            <TicketStat label="MISSED" value={String(detail.missedTickets)} />
            <TicketStat
              label="REMAINING"
              value={String(detail.remainingTickets)}
              emphasize
            />
          </View>

          <SurfaceCard noPadding>
            <View
              style={[
                styles.sectionBar,
                { borderBottomColor: detailTheme.border },
              ]}>
              <View style={styles.sectionBarLeft}>
                <Icon source="information-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: detailTheme.onSurface }]}>
                  Membership details
                </Text>
              </View>
            </View>
            <View style={styles.sectionBody}>
              <InfoRow label="Membership name" value={detail.name} />
              <InfoRow label="Customer" value={detail.customer} />
              <InfoRow label="Membership level" value={detail.membershipLevel} />
              <InfoRow label="Pricelist" value={detail.pricelist} />
              <InfoRow label="Start date" value={start} />
              <InfoRow label="End date" value={end} />
              <InfoRow label="Status" value={detail.status} />
              <InfoRow
                label="Monthly coupon amount"
                value={formatMoney(detail.monthlyCouponAmount)}
              />
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.infoLabel, { color: detailTheme.label }]}>
                  Benefits summary
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color: detail.benefitsSummary?.trim()
                        ? detailTheme.onSurface
                        : detailTheme.label,
                    },
                  ]}>
                  {detail.benefitsSummary?.trim() || '—'}
                </Text>
              </View>
            </View>
          </SurfaceCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    minHeight: '100%',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  padMobile: { padding: 12, paddingBottom: 32 },
  padDesktop: { padding: 20, paddingBottom: 40 },
  page: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    gap: 14,
  },
  surfaceCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  surfaceCardPad: { padding: 16 },
  hero: { padding: 20, gap: 16 },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  heroIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroName: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 22,
    lineHeight: 30,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroMuted: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  heroTotal: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
  },
  heroStock: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaGridStack: { flexDirection: 'column' },
  metaTile: {
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 160,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  metaTileIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
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
    lineHeight: 20,
  },
  ticketGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  ticketStat: {
    flexGrow: 1,
    flexBasis: '22%',
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
  },
  ticketLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  ticketValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  sectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 15,
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
});
