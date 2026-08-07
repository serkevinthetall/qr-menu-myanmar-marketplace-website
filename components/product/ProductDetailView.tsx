import { ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Icon,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { FavoriteStar } from '@/components/ui/FavoriteStar';
import { ProductThumb } from '@/components/ui/ProductThumb';
import { useDetailTheme } from '@/hooks/use-detail-theme';
import { useResponsive } from '@/hooks/use-responsive';
import { ProductDetail, ProductPricesUpdate } from '@/types/product';

type DetailTab = 'details' | 'prices';

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return `${value.toLocaleString('en-US', {
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

function DetailTabs({
  tab,
  onChange,
}: {
  tab: DetailTab;
  onChange: (tab: DetailTab) => void;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();

  return (
    <View style={[styles.tabBarRow, { borderBottomColor: detail.border }]}>
      <View style={styles.tabBar}>
        {(
          [
            { key: 'details' as const, label: 'Product details' },
            { key: 'prices' as const, label: 'Prices' },
          ] as const
        ).map(item => {
          const active = tab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              style={[
                styles.tab,
                active && { borderBottomColor: theme.colors.primary },
              ]}>
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

function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function PriceField({
  label,
  hint,
  value,
  onChangeText,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (next: string) => void;
}) {
  const theme = useTheme();
  const detail = useDetailTheme();

  return (
    <View style={[styles.priceField, { borderBottomColor: detail.border }]}>
      <Text style={[styles.infoLabel, { color: detail.label }]}>{label}</Text>
      {hint ? (
        <Text style={[styles.priceHint, { color: detail.label }]}>{hint}</Text>
      ) : null}
      <TextInput
        mode="outlined"
        dense
        keyboardType="numeric"
        value={value}
        onChangeText={onChangeText}
        right={<TextInput.Affix text="MMK" />}
        style={{ backgroundColor: detail.surface }}
        outlineColor={detail.border}
        activeOutlineColor={theme.colors.primary}
      />
    </View>
  );
}

type ProductDetailViewProps = {
  detail: ProductDetail | null;
  loading: boolean;
  error: string;
  onToggleFavorite?: (next: boolean) => void;
  favoriteBusy?: boolean;
  onSavePrices?: (updates: ProductPricesUpdate) => Promise<void>;
  pricesSaving?: boolean;
  pricesError?: string;
};

export function ProductDetailView({
  detail,
  loading,
  error,
  onToggleFavorite,
  favoriteBusy,
  onSavePrices,
  pricesSaving,
  pricesError,
}: ProductDetailViewProps) {
  const theme = useTheme();
  const detailTheme = useDetailTheme();
  const { width } = useResponsive();
  const isMobile = width < 768;
  const [tab, setTab] = useState<DetailTab>('details');
  const [salesInput, setSalesInput] = useState('');
  const [premiumInput, setPremiumInput] = useState('');
  const [proInput, setProInput] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!detail) return;
    setSalesInput(
      Number.isFinite(detail.price) ? String(Math.round(detail.price)) : '',
    );
    setPremiumInput(
      detail.premiumPrice?.price != null
        ? String(Math.round(detail.premiumPrice.price))
        : '',
    );
    setProInput(
      detail.proPrice?.price != null
        ? String(Math.round(detail.proPrice.price))
        : '',
    );
    setLocalError('');
  }, [detail]);

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

  const handleSavePrices = async () => {
    if (!onSavePrices) return;
    setLocalError('');

    const salesPrice = parseMoneyInput(salesInput);
    const premiumPrice = parseMoneyInput(premiumInput);
    const proPrice = parseMoneyInput(proInput);

    if (salesPrice == null || salesPrice < 0) {
      setLocalError('Enter a valid Sales price.');
      return;
    }
    if (premiumInput.trim() && (premiumPrice == null || premiumPrice < 0)) {
      setLocalError('Enter a valid Premium Membership price.');
      return;
    }
    if (proInput.trim() && (proPrice == null || proPrice < 0)) {
      setLocalError('Enter a valid Pro Membership price.');
      return;
    }

    const updates: ProductPricesUpdate = { salesPrice };
    if (premiumPrice != null) updates.premiumPrice = premiumPrice;
    if (proPrice != null) updates.proPrice = proPrice;

    try {
      await onSavePrices(updates);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to save prices.',
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: detailTheme.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          isMobile ? styles.padMobile : styles.padDesktop,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
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
                  <View style={styles.heroTitleRow}>
                    <Text style={styles.heroEyebrow}>PRODUCT</Text>
                    {onToggleFavorite ? (
                      <FavoriteStar
                        favorite={Boolean(detail.favorite)}
                        disabled={favoriteBusy}
                        onToggle={() => onToggleFavorite(!detail.favorite)}
                        size={26}
                        inactiveColor="rgba(255,255,255,0.85)"
                      />
                    ) : null}
                  </View>
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
            <DetailTabs tab={tab} onChange={setTab} />

            {tab === 'details' ? (
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
            ) : (
              <View style={styles.sectionBody}>
                <PriceField
                  label="Sales price (default)"
                  hint="Odoo Sales Price (list_price)"
                  value={salesInput}
                  onChangeText={setSalesInput}
                />
                <PriceField
                  label="Premium Membership"
                  hint={
                    detail.premiumPrice?.pricelistName
                      ? `Pricelist: ${detail.premiumPrice.pricelistName}`
                      : 'Pricelist: Premium Membership'
                  }
                  value={premiumInput}
                  onChangeText={setPremiumInput}
                />
                <PriceField
                  label="Pro Membership"
                  hint={
                    detail.proPrice?.pricelistName
                      ? `Pricelist: ${detail.proPrice.pricelistName}`
                      : 'Pricelist: Pro Membership'
                  }
                  value={proInput}
                  onChangeText={setProInput}
                />

                {localError || pricesError ? (
                  <Text style={[styles.priceError, { color: theme.colors.error }]}>
                    {localError || pricesError}
                  </Text>
                ) : null}

                {onSavePrices ? (
                  <View style={styles.priceActions}>
                    <Button
                      mode="contained"
                      icon="content-save-outline"
                      loading={Boolean(pricesSaving)}
                      disabled={Boolean(pricesSaving)}
                      onPress={() => {
                        void handleSavePrices();
                      }}>
                      Save prices
                    </Button>
                  </View>
                ) : null}
              </View>
            )}
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
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
  tabBarRow: {
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 12,
    letterSpacing: 0.4,
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
  priceField: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  priceHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceError: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  priceActions: {
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
});
