import { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, useTheme } from 'react-native-paper';

import { ProductThumb } from '@/components/ui/ProductThumb';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { ProductDetail } from '@/types/product';

function formatMoney(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

function productTypeLabel(type: string): string {
  switch (type) {
    case 'consu':
      return 'Consumable';
    case 'service':
      return 'Service';
    case 'product':
      return 'Storable';
    default:
      return type || '—';
  }
}

type ProductDetailViewProps = {
  detail: ProductDetail | null;
  loading: boolean;
  error: string;
};

export function ProductDetailView({
  detail,
  loading,
  error,
}: ProductDetailViewProps) {
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
            Loading product from Odoo...
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
            Could not load product
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
          <Text style={{ color: theme.colors.onSurfaceVariant }}>Product not found.</Text>
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
          {error ? (
            <Text style={{ color: theme.colors.error, paddingHorizontal: 4 }}>{error}</Text>
          ) : null}

          <SurfaceCard noPadding>
            <View style={[styles.hero, { backgroundColor: theme.colors.primary }]}>
              <View style={styles.heroTop}>
                <View style={styles.heroImageWrap}>
                  <ProductThumb uri={detail.image} size={88} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                  <Text style={styles.heroEyebrow}>PRODUCT</Text>
                  <Text style={styles.heroName} numberOfLines={3}>
                    {detail.name || '—'}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: detail.active
                          ? 'rgba(220,252,231,0.95)'
                          : 'rgba(254,226,226,0.95)',
                      },
                    ]}>
                    <Text
                      style={{
                        color: detail.active ? '#166534' : '#991B1B',
                        fontWeight: '700',
                        fontSize: 12,
                      }}>
                      {detail.active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.heroBottom}>
                <View>
                  <Text style={styles.heroMuted}>Sales price</Text>
                  <Text style={styles.heroTotal}>{formatMoney(detail.price)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.heroMuted}>On hand</Text>
                  <Text style={styles.heroStock}>{detail.stock}</Text>
                </View>
              </View>
            </View>
          </SurfaceCard>

          <View style={[styles.metaGrid, isMobile && styles.metaGridStack]}>
            <MetaTile
              icon="barcode"
              label="SKU"
              value={detail.sku}
              emphasize={!!detail.sku}
            />
            <MetaTile icon="shape-outline" label="CATEGORY" value={detail.category} />
            <MetaTile icon="weight-kilogram" label="UNIT" value={detail.unit} />
            <MetaTile
              icon="tag-outline"
              label="TYPE"
              value={productTypeLabel(detail.type)}
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
                  Product details
                </Text>
              </View>
            </View>
            <View style={styles.sectionBody}>
              <InfoRow label="Name" value={detail.name} />
              <InfoRow label="SKU / Internal reference" value={detail.sku} />
              <InfoRow label="Barcode" value={detail.barcode} />
              <InfoRow label="Category" value={detail.category} />
              <InfoRow label="Unit of measure" value={detail.unit} />
              <InfoRow label="Product type" value={productTypeLabel(detail.type)} />
              <InfoRow label="Sales price" value={formatMoney(detail.price)} />
              {detail.cost > 0 ? (
                <InfoRow label="Cost" value={formatMoney(detail.cost)} />
              ) : null}
              <InfoRow label="Quantity on hand" value={String(detail.stock)} />
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.infoLabel, { color: detailTheme.label }]}>
                  Sales description
                </Text>
                <Text
                  style={[
                    styles.infoValue,
                    {
                      color: detail.description?.trim()
                        ? detailTheme.onSurface
                        : detailTheme.label,
                    },
                  ]}>
                  {detail.description?.trim() || '—'}
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
  heroImageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.18)',
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
