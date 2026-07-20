import { Platform } from 'react-native';

/**
 * Two product surfaces in one Expo repo — keep them separate.
 *
 * WEB ERP  → routes `(drawer)/`, APIs `/api/auth|customers|products|quotations`
 * PHONE APP → routes `(app)/`,   APIs `/api/app/*`
 *
 * Phone UI lives under `components/app` + `services/app`.
 * Website UI lives under `components/{layout,quotation,contact}` + `services/{auth,customers,…}` / `services/web`.
 */
export function isSalesRepAppSurface(): boolean {
  return Platform.OS !== 'web';
}

export const APP_HOME = '/(app)/quotations' as const;
export const WEB_HOME = '/' as const;

export function homeRouteForSurface(): typeof APP_HOME | typeof WEB_HOME {
  return isSalesRepAppSurface() ? APP_HOME : WEB_HOME;
}

/** Separate session keys so web + phone never share auth state on the same device. */
export function sessionStorageKeyForSurface(): string {
  return isSalesRepAppSurface()
    ? '@qr_shop_app_session'
    : '@qr_shop_web_session';
}
