import { Colors } from '@/constants/theme';
import { useAppTheme } from '@/contexts/theme-context';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark,
) {
  const { mode } = useAppTheme();
  const colorFromProps = props[mode];

  if (colorFromProps) {
    return colorFromProps;
  }

  return Colors[mode][colorName];
}
