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

/**
 * Resolves the API base URL for web ERP and the sales-rep native app.
 * - Hosted HTTPS URLs are never overridden.
 * - On native, localhost is rewritten to the Expo LAN IP (phones cannot reach Mac localhost).
 * - On web via LAN IP, local backends use the same host on port 4000.
 */
function resolveApiBaseUrl(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

  // Native POS / Expo Go: rewrite loopback → Mac LAN IP so login works on device.
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
