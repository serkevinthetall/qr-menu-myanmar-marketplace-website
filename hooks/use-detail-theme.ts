import { useMemo } from 'react';
import { useTheme } from 'react-native-paper';

import { useAppColors } from '@/hooks/use-app-colors';

/** Shared palette for Odoo-style detail screens (quotation, contact). */
export function useDetailTheme() {
  const theme = useTheme();
  const colors = useAppColors();

  return useMemo(
    () => ({
      label: theme.colors.onSurfaceVariant,
      border: theme.colors.outline,
      surface: theme.colors.surface,
      onSurface: theme.colors.onSurface,
      background: theme.colors.background,
      headerBg: colors.detailHeaderBg,
      panelBg: colors.detailPanelBg,
      accentDivider: colors.detailAccentDivider,
      shadow: colors.detailShadow,
      cellText: theme.colors.onSurface,
      mutedText: theme.colors.onSurfaceVariant,
    }),
    [theme, colors],
  );
}
