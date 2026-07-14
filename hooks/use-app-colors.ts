import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/contexts/theme-context';

/** Returns the active color tokens for the current light/dark mode. */
export function useAppColors() {
  const { mode } = useAppTheme();
  return AppColors[mode];
}
