/**
 * Legacy theme map — kept for starter components.
 * All values are sourced from AppColors in constants/colors.ts.
 */
import { AppColors } from '@/constants/colors';

export const Colors = {
  light: {
    text: AppColors.light.text,
    background: AppColors.light.background,
    tint: AppColors.light.primary,
    icon: AppColors.light.textMuted,
    tabIconDefault: AppColors.light.textMuted,
    tabIconSelected: AppColors.light.primary,
    card: AppColors.light.card,
    border: AppColors.light.border,
    success: AppColors.light.success,
  },
  dark: {
    text: AppColors.dark.text,
    background: AppColors.dark.background,
    tint: AppColors.dark.primary,
    icon: AppColors.dark.textMuted,
    tabIconDefault: AppColors.dark.textMuted,
    tabIconSelected: AppColors.dark.primary,
    card: AppColors.dark.card,
    border: AppColors.dark.border,
    success: AppColors.dark.success,
  },
};

export const Fonts = {
  sans: 'System',
  serif: 'serif',
  rounded: 'System',
  mono: 'monospace',
};
