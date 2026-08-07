import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
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
  const [displayUri, setDisplayUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const resolvedUri = useMemo(
    () => resolveImageUri(uri, productId),
    [uri, productId],
  );

  const needsAuth =
    Boolean(session?.token) &&
    resolvedUri.startsWith(API_BASE_URL) &&
    resolvedUri.includes('/products/') &&
    resolvedUri.endsWith('/image');

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setFailed(false);
    setDisplayUri(null);

    if (!resolvedUri) {
      return;
    }

    // Web <img>/expo-image often cannot send Authorization headers.
    // Fetch the binary with the bearer token, then show a blob URL.
    if (needsAuth && session?.token) {
      void (async () => {
        try {
          const response = await fetch(resolvedUri, {
            headers: { Authorization: `Bearer ${session.token}` },
            cache: 'force-cache',
          });
          if (!response.ok) {
            throw new Error(`Image HTTP ${response.status}`);
          }
          const blob = await response.blob();
          if (cancelled) return;
          objectUrl = URL.createObjectURL(blob);
          setDisplayUri(objectUrl);
        } catch {
          if (!cancelled) setFailed(true);
        }
      })();
    } else {
      setDisplayUri(resolvedUri);
    }

    return () => {
      cancelled = true;
      if (objectUrl && Platform.OS === 'web') {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resolvedUri, needsAuth, session?.token]);

  if (displayUri && !failed) {
    return (
      <Image
        source={{ uri: displayUri }}
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
