import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Icon, Text, useTheme } from 'react-native-paper';

import { CustomerNameText } from '@/components/ui/CustomerNameText';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { CustomerDetail } from '@/types/customer';

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

function InfoRow({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: boolean;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const display = value?.trim();

  return (
    <View style={[styles.infoRow, { borderBottomColor: detail.border }]}>
      <Text style={[styles.infoLabel, { color: detail.label }]}>{label}</Text>
      <Text
        style={[
          styles.infoValue,
          {
            color: display
              ? link
                ? theme.colors.primary
                : detail.onSurface
              : detail.label,
          },
        ]}
        numberOfLines={4}>
        {display || '—'}
      </Text>
    </View>
  );
}

function TagChips({ tags }: { tags: string }) {
  const theme = useTheme();
  const parts = tags
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return (
      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>—</Text>
    );
  }

  return (
    <View style={styles.tagRow}>
      {parts.map(tag => (
        <View
          key={tag}
          style={[
            styles.tagChip,
            { backgroundColor: theme.colors.secondaryContainer },
          ]}>
          <Text
            style={{
              color: theme.colors.onSecondaryContainer,
              fontSize: 12,
              fontWeight: '600',
            }}>
            {tag}
          </Text>
        </View>
      ))}
    </View>
  );
}

function initials(name: string) {
  const parts = (name ?? '').trim().split(/\s+/).slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase() ?? '').join('') || '?';
}

function addressLines(detail: CustomerDetail): string {
  return [detail.street, detail.street2, detail.township, detail.city, detail.state, detail.zip, detail.country]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(', ');
}

type ContactDetailViewProps = {
  detail: CustomerDetail | null;
  loading: boolean;
  error: string;
};

export function ContactDetailView({
  detail,
  loading,
  error,
}: ContactDetailViewProps) {
  const theme = useTheme();
  const detailTheme = useDetailTheme();
  const { width } = useResponsive();
  const isMobile = width < 768;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
        <View style={styles.centerOverlay}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Loading contact from Odoo...
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
            Could not load contact
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
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Contact not found.</Text>
        </View>
      </View>
    );
  }

  const summaryAddress = addressLines(detail);

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
                <Avatar.Text
                  size={56}
                  label={initials(detail.name)}
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  labelStyle={{ color: '#fff', fontWeight: '700' }}
                />
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <Text style={styles.heroEyebrow}>CONTACT</Text>
                  <CustomerNameText
                    size="title"
                    style={[styles.heroName, { fontSize: 22, lineHeight: 34 }]}
                    numberOfLines={2}>
                    {detail.name || '—'}
                  </CustomerNameText>
                  {detail.memberCode ? (
                    <Text style={styles.heroMeta}>Member · {detail.memberCode}</Text>
                  ) : detail.relatedCompany ? (
                    <Text style={styles.heroMeta} numberOfLines={1}>
                      {detail.relatedCompany}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.heroBottom}>
                <View style={styles.heroChip}>
                  <Icon source="phone" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.heroChipText} numberOfLines={1}>
                    {detail.phone?.trim() || 'No phone'}
                  </Text>
                </View>
                <View style={styles.heroChip}>
                  <Icon source="email-outline" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.heroChipText} numberOfLines={1}>
                    {detail.email?.trim() || 'No email'}
                  </Text>
                </View>
              </View>
            </View>
          </SurfaceCard>

          <View style={[styles.metaGrid, isMobile && styles.metaGridStack]}>
            <MetaTile
              icon="phone"
              label="PHONE"
              value={detail.phone}
              emphasize={!!detail.phone}
            />
            <MetaTile icon="email-outline" label="EMAIL" value={detail.email} />
            <MetaTile
              icon="map-marker-outline"
              label="TOWNSHIP"
              value={detail.township}
            />
            <MetaTile
              icon="office-building-outline"
              label="RELATED COMPANY"
              value={detail.relatedCompany}
            />
          </View>

          <SurfaceCard noPadding>
            <View
              style={[
                styles.sectionBar,
                { borderBottomColor: detailTheme.border },
              ]}>
              <View style={styles.sectionBarLeft}>
                <Icon source="account-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: detailTheme.onSurface }]}>
                  Contact details
                </Text>
              </View>
            </View>
            <View style={styles.sectionBody}>
              <InfoRow label="Name" value={detail.name} />
              <InfoRow label="Related company" value={detail.relatedCompany} />
              <InfoRow label="Email" value={detail.email} link />
              <InfoRow label="Phone" value={detail.phone} />
              <InfoRow label="Member code" value={detail.memberCode} />
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.infoLabel, { color: detailTheme.label }]}>Tags</Text>
                <TagChips tags={detail.tags} />
              </View>
            </View>
          </SurfaceCard>

          <SurfaceCard noPadding>
            <View
              style={[
                styles.sectionBar,
                { borderBottomColor: detailTheme.border },
              ]}>
              <View style={styles.sectionBarLeft}>
                <Icon source="home-map-marker" size={18} color={theme.colors.primary} />
                <Text style={[styles.sectionTitle, { color: detailTheme.onSurface }]}>
                  Address
                </Text>
              </View>
            </View>
            <View style={styles.sectionBody}>
              {summaryAddress ? (
                <Text
                  style={[
                    styles.addressSummary,
                    { color: detailTheme.onSurface, backgroundColor: detailTheme.panelBg },
                  ]}>
                  {summaryAddress}
                </Text>
              ) : null}
              <View style={[styles.addressGrid, isMobile && styles.addressGridStack]}>
                <View style={styles.addressCol}>
                  <InfoRow label="Address 1" value={detail.street} />
                  <InfoRow label="Address 2" value={detail.street2} />
                  <InfoRow label="Township" value={detail.township} />
                  <InfoRow label="City" value={detail.city} />
                </View>
                <View style={styles.addressCol}>
                  <InfoRow label="State" value={detail.state} />
                  <InfoRow label="ZIP" value={detail.zip} />
                  <InfoRow label="Country" value={detail.country} />
                </View>
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
  scrollContent: {
    flexGrow: 1,
  },
  padMobile: {
    padding: 12,
    paddingBottom: 32,
  },
  padDesktop: {
    padding: 20,
    paddingBottom: 40,
  },
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
  surfaceCardPad: {
    padding: 16,
  },
  hero: {
    padding: 20,
    gap: 16,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '600',
  },
  heroBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    maxWidth: '100%',
  },
  heroChipText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 220,
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
    fontWeight: '700',
    lineHeight: 20,
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
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  addressSummary: {
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
  },
  addressGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  addressGridStack: {
    flexDirection: 'column',
    gap: 0,
  },
  addressCol: {
    flex: 1,
    minWidth: 0,
  },
});
