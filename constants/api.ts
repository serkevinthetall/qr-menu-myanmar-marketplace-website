import { Platform } from 'react-native';

function isLocalDevApiUrl(url: string): boolean {
  return (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    /192\.168\.\d+\.\d+/.test(url) ||
    /10\.\d+\.\d+\.\d+/.test(url)
  );
}

/**
 * On web, when opened via LAN IP (e.g. http://192.168.x.x:8081) and the env URL
 * points at a local backend, call the API on the same host so you don't have to
 * edit .env every time your IP changes. Hosted API URLs are never overridden.
 */
function resolveApiBaseUrl(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

  if (
    isLocalDevApiUrl(fromEnv) &&
    Platform.OS === 'web' &&
    typeof window !== 'undefined'
  ) {
    const { hostname, protocol } = window.location;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return `${protocol}//${hostname}:4000/api`;
    }
  }

  return fromEnv;
}

export const API_BASE_URL = resolveApiBaseUrl();
