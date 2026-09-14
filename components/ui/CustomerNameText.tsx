import { StyleSheet, Text, TextProps, StyleProp, TextStyle } from 'react-native';
import { useTheme } from 'react-native-paper';

type Props = Omit<TextProps, 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
  size?: 'body' | 'title';
};

/**
 * Myanmar-safe customer name text.
 * Matches table/body Paper Text metrics so names sit on the same baseline
 * as neighboring cells (no extra top/bottom padding).
 */
export function CustomerNameText({
  children,
  style,
  muted = false,
  size = 'body',
  ...rest
}: Props) {
  const theme = useTheme();
  const fontSize = size === 'title' ? 17 : 14;
  const lineHeight = size === 'title' ? 24 : 20;

  return (
    <Text
      {...rest}
      style={[
        styles.base,
        {
          fontSize,
          lineHeight,
          color: muted
            ? theme.colors.onSurfaceVariant
            : theme.colors.onSurface,
        },
        style,
      ]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontWeight: '500',
    // Keep glyphs unclipped without shifting the baseline vs sibling Text.
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
