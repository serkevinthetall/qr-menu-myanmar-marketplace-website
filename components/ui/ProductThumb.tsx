import { Image } from 'expo-image';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

type ProductThumbProps = {
  uri?: string;
  size?: number;
  style?: ViewStyle;
};

export function ProductThumb({ uri, size = 40, style }: ProductThumbProps) {
  const theme = useTheme();

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: Math.max(4, size * 0.12) },
          style,
        ]}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: Math.max(4, size * 0.12),
          backgroundColor: theme.colors.surfaceVariant,
        },
        style,
      ]}>
      <Icon
        source="package-variant"
        size={Math.round(size * 0.45)}
        color={theme.colors.onSurfaceVariant}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#f1f5f9',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
