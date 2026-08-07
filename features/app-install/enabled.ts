/**
 * TEMPORARY FEATURE — Call List (phone-app install follow-up, MongoDB)
 *
 * Independent of App Order (online-orders). No shared unread/notification state.
 *
 * Kill switch (hide UI immediately):
 *   EXPO_PUBLIC_ENABLE_APP_INSTALL_CALL_LIST=false
 *
 * Full removal checklist (delete these, then drop wire-ups):
 *   - frontend/features/app-install/   (this folder)
 *   - frontend/app/(drawer)/call-list.tsx
 *   - Wire-ups tagged: @temp-feature app-install-call-list
 *     · frontend/constants/navigation.ts (CALL_LIST entry)
 *     · frontend/app/(drawer)/customers.tsx (useContactAppInstall + column)
 *   - backend/src/config/mongo.ts
 *   - backend/src/models/app-install.model.ts
 *   - backend/src/routes/app-installs.routes.ts
 *   - backend mount in src/routes/index.ts
 *   - mongoose dependency + MONGODB_URI / ENABLE_APP_INSTALL_CALL_LIST in env
 *   - fetchOdooContactsByIds in odoo.service.ts (only used by this feature)
 */

function readFlag(value: string | undefined, defaultEnabled: boolean): boolean {
  if (value == null || value.trim() === '') {
    return defaultEnabled;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'false' || normalized === '0' || normalized === 'off') {
    return false;
  }
  if (normalized === 'true' || normalized === '1' || normalized === 'on') {
    return true;
  }
  return defaultEnabled;
}

/** Flip off without deleting code. Defaults on while the temporary campaign runs. */
export const ENABLE_APP_INSTALL_CALL_LIST = readFlag(
  process.env.EXPO_PUBLIC_ENABLE_APP_INSTALL_CALL_LIST,
  true,
);
