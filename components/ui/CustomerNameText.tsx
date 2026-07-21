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
 * Avoids Paper Text variants whose theme line-heights clip Burmese glyphs.
 */
export function CustomerNameText({
  children,
  style,
  muted = false,
  size = 'body',
  ...rest
}: Props) {
  const theme = useTheme();
  const fontSize = size === 'title' ? 17 : 15;
  const lineHeight = size === 'title' ? 30 : 28;

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
    paddingTop: 3,
    paddingBottom: 5,
  },
});
