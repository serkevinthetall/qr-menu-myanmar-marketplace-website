import { Platform } from 'react-native';

/**
 * Web ERP uses the drawer UI + /api/* routes.
 * Native (Android POS / iOS) uses the sales-rep tab app + /api/app/* routes.
 */
export function isSalesRepAppSurface(): boolean {
  return Platform.OS !== 'web';
}

export const APP_HOME = '/(app)/quotations' as const;
export const WEB_HOME = '/' as const;

export function homeRouteForSurface(): typeof APP_HOME | typeof WEB_HOME {
  return isSalesRepAppSurface() ? APP_HOME : WEB_HOME;
}
