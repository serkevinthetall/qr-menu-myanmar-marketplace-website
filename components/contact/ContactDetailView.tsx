import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Text, useTheme } from 'react-native-paper';

import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { CustomerDetail } from '@/types/customer';

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
}: {
  label: string;
  value: string;
  link?: boolean;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();
  const display = value?.trim();

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
        numberOfLines={4}>
        {display || '—'}
      </Text>
    </View>
  );
}

function initials(name: string) {
  const parts = (name ?? '').trim().split(/\s+/).slice(0, 2);
  return parts.map(part => part[0]?.toUpperCase() ?? '').join('') || '?';
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

  return (
    <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={{ marginTop: 12, color: theme.colors.onSurfaceVariant }}>
            Loading contact from Odoo...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text
            variant="titleMedium"
            style={{ fontWeight: '600', marginBottom: 8, color: theme.colors.onSurface }}>
            Could not load contact
          </Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      ) : detail ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <SurfaceCard>
            <View style={styles.hero}>
              <Avatar.Text
                size={56}
                label={initials(detail.name)}
                style={{ backgroundColor: theme.colors.secondaryContainer }}
                labelStyle={{ color: theme.colors.onSecondaryContainer }}
              />
              <View style={styles.heroText}>
                <Text
                  variant="headlineSmall"
                  style={[styles.heroName, { color: detailTheme.onSurface }]}>
                  {detail.name}
                </Text>
                {detail.memberCode ? (
                  <Text style={[styles.heroMeta, { color: detailTheme.label }]}>
                    Member Code: {detail.memberCode}
                  </Text>
                ) : null}
              </View>
            </View>
          </SurfaceCard>

          <SurfaceCard>
            <View style={[styles.infoLayout, isMobile && styles.infoLayoutStack]}>
              <View style={styles.infoCol}>
                <MetaField label="NAME" value={detail.name} />
                <MetaField label="RELATED COMPANY" value={detail.relatedCompany} />
                <MetaField label="EMAIL" value={detail.email} link />
                <MetaField label="PHONE" value={detail.phone} />
                <MetaField label="MEMBER CODE" value={detail.memberCode} />
                <MetaField label="TAGS" value={detail.tags} />
              </View>
              <View style={styles.infoCol}>
                <MetaField label="ADDRESS 1" value={detail.street} />
                <MetaField label="ADDRESS 2" value={detail.street2} />
                <MetaField label="TOWNSHIP" value={detail.township} />
                <MetaField label="CITY" value={detail.city} />
                <MetaField label="STATE" value={detail.state} />
                <MetaField label="ZIP" value={detail.zip} />
                <MetaField label="COUNTRY" value={detail.country} />
              </View>
            </View>
          </SurfaceCard>
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
  scrollContent: {
    padding: 16,
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
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroName: {
    fontWeight: '700',
  },
  heroMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 16,
  },
  infoLayoutStack: {
    flexDirection: 'column',
  },
  infoCol: {
    flex: 1,
    gap: 14,
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
});
