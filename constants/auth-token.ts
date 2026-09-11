/**
 * Legacy web session marker (cookie-only mode).
 * Prefer a real JWT in AsyncStorage for cross-site Vercel frontends
 * where httpOnly cookies are not sent (`sec-fetch-site: cross-site`).
 */
export const WEB_COOKIE_AUTH_TOKEN = 'cookie';

export function isWebBearerToken(token?: string | null): boolean {
  return Boolean(token && token !== WEB_COOKIE_AUTH_TOKEN);
}
