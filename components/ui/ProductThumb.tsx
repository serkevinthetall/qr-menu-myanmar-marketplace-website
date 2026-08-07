import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

import { API_BASE_URL } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';

type ProductThumbProps = {
  /** Absolute http(s)/data URI, or relative `/products/:id/image` path. */
  uri?: string;
  /** Prefer productId — loads via authenticated API image proxy. */
  productId?: string;
  size?: number;
  style?: ViewStyle;
};

function resolveImageUri(uri: string | undefined, productId: string | undefined): string {
  if (productId) {
    return `${API_BASE_URL}/products/${productId}/image`;
  }
  const raw = String(uri ?? '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:') || raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  if (raw.startsWith('/')) {
    return `${API_BASE_URL}${raw}`;
  }
  return raw;
}

export function ProductThumb({
  uri,
  productId,
  size = 40,
  style,
}: ProductThumbProps) {
  const theme = useTheme();
  const { session } = useAuth();
  const [failed, setFailed] = useState(false);

  const resolvedUri = useMemo(
    () => resolveImageUri(uri, productId),
    [uri, productId],
  );

  useEffect(() => {
    setFailed(false);
  }, [resolvedUri, session?.token]);

  const needsAuth =
    Boolean(session?.token) &&
    resolvedUri.startsWith(API_BASE_URL) &&
    resolvedUri.includes('/products/') &&
    resolvedUri.endsWith('/image');

  if (resolvedUri && !failed) {
    return (
      <Image
        source={{
          uri: resolvedUri,
          ...(needsAuth
            ? { headers: { Authorization: `Bearer ${session!.token}` } }
            : null),
        }}
        style={[
          styles.image,
          { width: size, height: size, borderRadius: Math.max(4, size * 0.12) },
          style,
        ]}
        contentFit="cover"
        onError={() => setFailed(true)}
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
