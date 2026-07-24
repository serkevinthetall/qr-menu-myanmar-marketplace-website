import { useCallback, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Icon,
  Text,
  useTheme,
} from 'react-native-paper';

import { ThemeMode } from '@/constants/colors';
import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { useAppTheme } from '@/contexts/theme-context';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { MembershipCouponTicket } from '@/types/membership';
import { formatMyanmarDate } from '@/utils/myanmar-datetime';

function formatAmount(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function initials(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/).slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase() ?? '').join('') || '?';
}

function membershipTierLabel(membership: string): string {
  const match = membership.match(
    /((?:Premium|Gold|Silver|Basic|Standard|VIP)\s+Membership)/i,
  );
  if (match?.[1]) {
    return match[1];
  }
  if (membership.toLowerCase().includes('premium')) {
    return 'Premium Membership';
  }
  return 'membership';
}

function displayDateOrDash(value: string): string {
  const raw = value?.trim() || '';
  if (!raw || raw === 'false') {
    return '—';
  }
  return formatMyanmarDate(raw) || raw;
}

function displayTicketMonth(value: string): string {
  const raw = value?.trim() || '';
  if (!raw || raw === 'false') {
    return '—';
  }
  // Prefer the Odoo date string when already YYYY-MM-DD (matches mockup).
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }
  return formatMyanmarDate(raw) || raw;
}

function isAvailableStatus(status: string): boolean {
  const value = status.trim().toLowerCase();
  return (
    value.includes('available') ||
    value.includes('unused') ||
    value.includes('new') ||
    value.includes('valid')
  );
}

function getCouponStatusColors(
  mode: ThemeMode,
  status: string,
): { label: string; bg: string; fg: string; dot: string } {
  const value = status.trim().toLowerCase();
  const label = status.trim() || '—';

  if (isAvailableStatus(status)) {
    return {
      label,
      bg: mode === 'dark' ? 'rgba(16, 185, 129, 0.22)' : '#DCFCE7',
      fg: mode === 'dark' ? '#6EE7B7' : '#16A34A',
      dot: '#22C55E',
    };
  }
  if (value.includes('used') || value.includes('redeem')) {
    return {
      label,
      bg: mode === 'dark' ? 'rgba(59, 130, 246, 0.22)' : '#DBEAFE',
      fg: mode === 'dark' ? '#93C5FD' : '#1E40AF',
      dot: '#3B82F6',
    };
  }
  if (value.includes('expire') || value.includes('cancel') || value.includes('void')) {
    return {
      label,
      bg: mode === 'dark' ? 'rgba(239, 68, 68, 0.22)' : '#FEE2E2',
      fg: mode === 'dark' ? '#FCA5A5' : '#991B1B',
      dot: '#EF4444',
    };
  }
  return {
    label,
    bg: mode === 'dark' ? '#334155' : '#E2E8F0',
    fg: mode === 'dark' ? '#CBD5E1' : '#475569',
    dot: '#94A3B8',
  };
}

function SurfaceCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: object;
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
        style,
      ]}>
      {children}
    </View>
  );
}

function TimelineRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const display = value?.trim() || '—';

  return (
    <View style={styles.timelineRow}>
      <View
        style={[
          styles.timelineIcon,
          { backgroundColor: detail.panelBg, borderColor: detail.border },
        ]}>
        <Icon source={icon} size={18} color={theme.colors.onSurfaceVariant} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[styles.fieldLabel, { color: detail.label }]}>{label}</Text>
        <Text
          style={[styles.timelineValue, { color: detail.onSurface }]}
          numberOfLines={2}>
          {display}
        </Text>
      </View>
    </View>
  );
}

async function copyText(value: string): Promise<boolean> {
  const text = value.trim();
  if (!text) {
    return false;
  }

  try {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      return ok;
    }
  } catch {
    return false;
  }

  return false;
}

type MembershipCouponDetailViewProps = {
  detail: MembershipCouponTicket | null;
  loading: boolean;
  error: string;
};

export function MembershipCouponDetailView({
  detail,
  loading,
  error,
}: MembershipCouponDetailViewProps) {
  const theme = useTheme();
  const { mode } = useAppTheme();
  const detailTheme = useDetailTheme();
  const { width } = useResponsive();
  const isMobile = width < 900;
  const [copied, setCopied] = useState(false);

  const onCopyCode = useCallback(async () => {
    if (!detail?.couponCode && !detail?.name) {
      return;
    }
    const ok = await copyText(detail.couponCode || detail.name);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }, [detail?.couponCode, detail?.name]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Loading coupon ticket from Odoo...
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
            Could not load coupon ticket
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
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            Coupon ticket not found.
          </Text>
        </View>
      </View>
    );
  }

  const status = getCouponStatusColors(mode, detail.status);
  const usedDate = displayDateOrDash(detail.usedDate);
  const ticketMonth = displayTicketMonth(detail.ticketMonth);
  const couponCode = detail.couponCode?.trim() || detail.name?.trim() || '—';
  const currency = detail.currency?.trim() || 'MMK';
  const tier = membershipTierLabel(detail.membership || '');
  const benefitsBlurb = `View exclusive deals available only to ${tier} holders for this month.`;

  const coreCard = (
    <SurfaceCard style={styles.coreCard}>
      <View
        style={[
          styles.cardHeader,
          {
            backgroundColor: detailTheme.panelBg,
            borderBottomColor: detailTheme.border,
          },
        ]}>
        <Text style={[styles.cardHeaderTitle, { color: detailTheme.onSurface }]}>
          Coupon Core Information
        </Text>
        <Icon
          source="information-outline"
          size={18}
          color={theme.colors.onSurfaceVariant}
        />
      </View>

      <View style={styles.coreBody}>
        <View style={[styles.coreTop, isMobile && styles.stack]}>
          <View style={styles.coreField}>
            <Text style={[styles.fieldLabel, { color: detailTheme.label }]}>
              COUPON ORDER
            </Text>
            <Text
              style={[styles.orderValue, { color: theme.colors.primary }]}
              numberOfLines={2}>
              {detail.name?.trim() || '—'}
            </Text>
          </View>

          <View style={styles.coreField}>
            <Text style={[styles.fieldLabel, { color: detailTheme.label }]}>
              COUPON CODE
            </Text>
            <View style={styles.codeRow}>
              <View
                style={[
                  styles.codeBox,
                  {
                    backgroundColor: detailTheme.panelBg,
                    borderColor: detailTheme.border,
                  },
                ]}>
                <Text
                  style={[styles.codeText, { color: detailTheme.onSurface }]}
                  numberOfLines={1}>
                  {couponCode}
                </Text>
              </View>
              <Pressable
                onPress={onCopyCode}
                accessibilityLabel="Copy coupon code"
                style={styles.copyBtnBare}>
                <Icon
                  source={copied ? 'check' : 'content-copy'}
                  size={18}
                  color={theme.colors.primary}
                />
              </Pressable>
            </View>
          </View>
        </View>

        <View
          style={[styles.dashedDivider, { borderBottomColor: detailTheme.border }]}
        />

        <View style={styles.membershipBlock}>
          <Text style={[styles.fieldLabel, { color: detailTheme.label }]}>
            MEMBERSHIP
          </Text>
          <Text
            style={[styles.membershipValue, { color: detailTheme.onSurface }]}
            numberOfLines={3}>
            {detail.membership?.trim() || '—'}
          </Text>
        </View>

        <View style={[styles.peopleRow, isMobile && styles.stack]}>
          <View style={styles.personCol}>
            <Text style={[styles.fieldLabel, { color: detailTheme.label }]}>
              CUSTOMER
            </Text>
            <View style={styles.personRow}>
              <Avatar.Text
                size={34}
                label={initials(detail.customer)}
                style={{ backgroundColor: theme.colors.primaryContainer }}
                labelStyle={{
                  color: theme.colors.primary,
                  fontWeight: '700',
                  fontSize: 12,
                }}
              />
              <CustomerNameText
                size="body"
                style={{ fontWeight: '700', flex: 1 }}
                numberOfLines={2}>
                {detail.customer?.trim() || '—'}
              </CustomerNameText>
            </View>
          </View>

          <View style={styles.personCol}>
            <Text style={[styles.fieldLabel, { color: detailTheme.label }]}>
              CONTACT
            </Text>
            <CustomerNameText
              size="body"
              style={{ fontWeight: '700' }}
              numberOfLines={2}>
              {detail.contact?.trim() || '—'}
            </CustomerNameText>
          </View>
        </View>
      </View>
    </SurfaceCard>
  );

  const validityCard = (
    <SurfaceCard style={styles.timelineCard}>
      <View style={styles.timelineHeader}>
        <Text style={[styles.cardHeaderTitle, { color: detailTheme.onSurface }]}>
          Validity & Timeline
        </Text>
      </View>

      <View style={styles.timelineBody}>
        <TimelineRow
          icon="calendar-month-outline"
          label="TICKET MONTH"
          value={ticketMonth}
        />
        <TimelineRow
          icon="calendar-remove-outline"
          label="USED DATE"
          value={usedDate}
        />
        <TimelineRow
          icon="receipt-text-outline"
          label="USED SALE ORDER"
          value={detail.usedSaleOrder}
        />
      </View>

      <View
        style={[
          styles.statusFooter,
          {
            backgroundColor: detailTheme.panelBg,
            borderTopColor: detailTheme.border,
          },
        ]}>
        <Text style={[styles.statusFooterLabel, { color: detailTheme.label }]}>
          Current Status
        </Text>
        <View style={styles.statusRight}>
          <View style={[styles.statusDot, { backgroundColor: status.dot }]} />
          <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
        </View>
      </View>
    </SurfaceCard>
  );

  const programCard = (
    <SurfaceCard style={styles.bottomCard}>
      <Text style={[styles.bottomTitle, { color: detailTheme.onSurface }]}>
        Coupon Program
      </Text>
      <View style={styles.programRow}>
        <View
          style={[
            styles.programIcon,
            { backgroundColor: theme.colors.primaryContainer },
          ]}>
          <Icon source="tag" size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text
            style={[styles.programName, { color: detailTheme.onSurface }]}
            numberOfLines={3}>
            {detail.couponProgram?.trim() || '—'}
          </Text>
          <Text style={[styles.programSub, { color: detailTheme.label }]}>
            Active Campaign
          </Text>
        </View>
      </View>
    </SurfaceCard>
  );

  const financialCard = (
    <SurfaceCard style={styles.bottomCard}>
      <Text style={[styles.bottomTitle, { color: detailTheme.onSurface }]}>
        Financial Value
      </Text>
      <Text style={[styles.moneyValue, { color: theme.colors.primary }]}>
        {formatAmount(detail.couponAmount)} {currency}
      </Text>
      <Text style={[styles.moneySub, { color: detailTheme.label }]}>
        Currency: {currency}
      </Text>
    </SurfaceCard>
  );

  const benefitsCard = (
    <View style={[styles.benefitsCard, { backgroundColor: theme.colors.primary }]}>
      <View style={styles.benefitsPattern} pointerEvents="none">
        <View style={[styles.hex, { top: 10, right: 16 }]} />
        <View style={[styles.hex, { top: 44, right: 52, opacity: 0.35 }]} />
        <View style={[styles.hex, { bottom: 14, right: 26, opacity: 0.22 }]} />
        <View
          style={[
            styles.hex,
            { top: 28, right: 88, width: 36, height: 36, opacity: 0.18 },
          ]}
        />
      </View>
      <Text style={styles.benefitsTitle}>Member Benefits</Text>
      <Text style={styles.benefitsBody}>{benefitsBlurb}</Text>
    </View>
  );

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

          {isMobile ? (
            <View style={styles.stackGap}>
              {coreCard}
              {validityCard}
              {programCard}
              {financialCard}
              {benefitsCard}
            </View>
          ) : (
            <View style={styles.desktopGrid}>
              <View style={styles.leftCol}>
                {coreCard}
                <View style={styles.bottomPair}>
                  {programCard}
                  {financialCard}
                </View>
              </View>
              <View style={styles.rightCol}>
                {validityCard}
                {benefitsCard}
              </View>
            </View>
          )}
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
    maxWidth: 1100,
    alignSelf: 'center',
  },
  stackGap: {
    gap: 14,
  },
  stack: {
    flexDirection: 'column',
  },
  desktopGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 14,
  },
  leftCol: {
    flex: 1.75,
    minWidth: 0,
    gap: 14,
  },
  rightCol: {
    flex: 1,
    minWidth: 280,
    gap: 14,
  },
  bottomPair: {
    flexDirection: 'row',
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
  coreCard: {
    width: '100%',
  },
  timelineCard: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bottomCard: {
    flex: 1,
    minWidth: 0,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  coreBody: {
    padding: 16,
    gap: 16,
  },
  coreTop: {
    flexDirection: 'row',
    gap: 16,
  },
  coreField: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  orderValue: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeBox: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  codeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  copyBtnBare: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  membershipBlock: {
    gap: 6,
  },
  membershipValue: {
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
  },
  peopleRow: {
    flexDirection: 'row',
    gap: 16,
  },
  personCol: {
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timelineHeader: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  timelineBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
    flex: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  statusFooterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  bottomTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  programIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programName: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  programSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  moneyValue: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  moneySub: {
    fontSize: 12,
    fontWeight: '600',
  },
  benefitsCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    padding: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    gap: 8,
    minHeight: 150,
  },
  benefitsPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  hex: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.22)',
    transform: [{ rotate: '20deg' }],
  },
  benefitsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  benefitsBody: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    maxWidth: 260,
  },
});
