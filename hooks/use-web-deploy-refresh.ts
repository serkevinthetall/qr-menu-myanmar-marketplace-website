import { useEffect } from 'react';
import { Platform } from 'react-native';

const POLL_MS = 30_000;
const RELOAD_GUARD_KEY = 'qr-shop-reloaded-build';

type VersionPayload = { buildId?: string };

function isLocalHost(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

async function fetchBuildId(): Promise<string> {
  const response = await fetch(`/version.json?t=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    return '';
  }
  const data = (await response.json()) as VersionPayload;
  return String(data.buildId ?? '').trim();
}

function hardRefresh(buildId: string) {
  if (typeof window === 'undefined') {
    return;
  }
  const token = buildId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
  const url = new URL(window.location.href);
  url.searchParams.set('_v', token || String(Date.now()));
  window.location.replace(url.toString());
}

/** Web only: hard-refresh when Vercel publishes a new frontend build. */
export function useWebDeployRefresh() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || isLocalHost()) {
      return;
    }

    let cancelled = false;
    let currentBuildId = '';

    const check = async () => {
      try {
        const nextId = await fetchBuildId();
        if (cancelled || !nextId) {
          return;
        }
        if (!currentBuildId) {
          currentBuildId = nextId;
          return;
        }
        if (nextId === currentBuildId) {
          return;
        }
        const alreadyReloaded = window.sessionStorage.getItem(RELOAD_GUARD_KEY);
        if (alreadyReloaded === nextId) {
          currentBuildId = nextId;
          return;
        }
        window.sessionStorage.setItem(RELOAD_GUARD_KEY, nextId);
        hardRefresh(nextId);
      } catch {
        // Missing version.json or offline — skip.
      }
    };

    void check();
    const timer = window.setInterval(() => {
      void check();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void check();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);
}
