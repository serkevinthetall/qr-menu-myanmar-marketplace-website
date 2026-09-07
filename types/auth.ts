export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthSession = {
  /**
   * Bearer token for the native app.
   * Website uses an httpOnly cookie — token may be empty on web.
   */
  token: string;
  user: AuthUser;
  expiresAt: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};
