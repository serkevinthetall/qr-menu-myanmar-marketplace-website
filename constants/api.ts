/**
 * Shared API host (Vercel or local). Path prefixes differ by surface:
 *
 *   WEB  → /api/auth, /api/customers, /api/products, /api/quotations
 *   APP  → /api/app/auth, /api/app/contacts, /api/app/products, /api/app/quotations
 *
 * Clients: `@/services/web/client` vs `@/services/app/client`
 */
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function isLoopbackApiUrl(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

function isPrivateLanApiUrl(url: string): boolean {
  return /192\.168\.\d+\.\d+/.test(url) || /10\.\d+\.\d+\.\d+/.test(url);
}

function isLocalDevApiUrl(url: string): boolean {
  return isLoopbackApiUrl(url) || isPrivateLanApiUrl(url);
}

/** Expo Go host, e.g. "192.168.100.195:8081" → "192.168.100.195" */
function getExpoLanHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.experienceUrl?.replace(/^[a-z]+:\/\//, '') ??
    null;
  if (!hostUri) {
    return null;
  }
  const host = hostUri.split(':')[0]?.trim();
  if (!host || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }
  return host;
}

function resolveApiBaseUrl(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

  if (Platform.OS !== 'web' && isLoopbackApiUrl(fromEnv)) {
    const lanHost = getExpoLanHost();
    if (lanHost) {
      return fromEnv
        .replace('localhost', lanHost)
        .replace('127.0.0.1', lanHost);
    }
  }

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
