/**
 * QR Shop ERP — single source of truth for all UI colors.
 * Import from here only. Do not hardcode hex values in components.
 */
export const Palette = {
  background: '#F6F8FB',
  primary: '#2563EB',
  success: '#10B981',
  text: '#0F172A',
  card: '#FFFFFF',
  border: '#E2E8F0',
  onPrimary: '#FFFFFF',
  textMuted: '#475569',
  drawerOverlay: 'rgba(0,0,0,0.35)',
  headerRipple: 'rgba(255,255,255,0.2)',
} as const;

const sharedHeaderField = {
  headerFieldBg: 'rgba(255,255,255,0.95)',
  headerFieldBorder: 'rgba(255,255,255,0.35)',
  headerFieldText: '#0F172A',
  headerFieldMuted: '#64748B',
  headerChipBg: 'rgba(255,255,255,0.92)',
  headerChipText: '#334155',
  headerChipBorder: 'rgba(255,255,255,0.35)',
} as const;

export const AppColors = {
  light: {
    background: Palette.background,
    primary: Palette.primary,
    success: Palette.success,
    text: Palette.text,
    card: Palette.card,
    border: Palette.border,
    onPrimary: Palette.onPrimary,
    textMuted: Palette.textMuted,
    drawerOverlay: Palette.drawerOverlay,
    headerRipple: Palette.headerRipple,
    searchBg: 'rgba(255,255,255,0.18)',
    searchText: Palette.onPrimary,
    searchPlaceholder: 'rgba(255,255,255,0.75)',
    searchIcon: 'rgba(255,255,255,0.85)',
    detailHeaderBg: '#F1F5F9',
    detailPanelBg: '#EFF6FF',
    detailAccentDivider: '#BFDBFE',
    detailShadow: '#0F172A',
    printOverlay: '#E2E8F0',
    printPreviewBg: '#CBD5E1',
    printThermalBg: '#0F172A',
    ...sharedHeaderField,
  },
  dark: {
    background: '#0B1220',
    primary: '#3B82F6',
    success: Palette.success,
    text: '#F1F5F9',
    card: '#1E293B',
    border: '#334155',
    onPrimary: Palette.onPrimary,
    textMuted: '#94A3B8',
    drawerOverlay: Palette.drawerOverlay,
    headerRipple: Palette.headerRipple,
    searchBg: 'rgba(255,255,255,0.12)',
    searchText: Palette.onPrimary,
    searchPlaceholder: 'rgba(255,255,255,0.6)',
    searchIcon: 'rgba(255,255,255,0.8)',
    detailHeaderBg: '#1A2744',
    detailPanelBg: '#1E3A5F',
    detailAccentDivider: '#334155',
    detailShadow: '#000000',
    printOverlay: '#0B1220',
    printPreviewBg: '#1E293B',
    printThermalBg: '#0F172A',
    ...sharedHeaderField,
  },
} as const;

export type ThemeMode = 'light' | 'dark';
export type AppColorScheme = keyof typeof AppColors;
export type AppColorToken = keyof (typeof AppColors)['light'];

export function getAppColors(mode: ThemeMode) {
  return AppColors[mode];
}
