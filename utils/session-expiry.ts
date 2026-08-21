type SessionExpiredListener = () => void;

const listeners = new Set<SessionExpiredListener>();
let handling = false;

export function isAuthSessionErrorMessage(message: string): boolean {
  const text = message.trim().toLowerCase();
  if (!text) {
    return false;
  }
  return (
    text.includes('user is not connected') ||
    text.includes('session expired') ||
    text.includes('please log in again') ||
    text.includes('authentication required') ||
    text.includes('invalid or expired token') ||
    text.includes('odoo session expired')
  );
}

export function subscribeSessionExpired(
  listener: SessionExpiredListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Clears local auth so AuthGate can send the user to /login. */
export function notifySessionExpired(): void {
  if (handling) {
    return;
  }
  handling = true;
  listeners.forEach(listener => {
    try {
      listener();
    } catch {
      // Ignore listener failures so every subscriber still runs.
    }
  });
  // Allow a later expiry (e.g. after re-login) to fire again.
  setTimeout(() => {
    handling = false;
  }, 1500);
}
