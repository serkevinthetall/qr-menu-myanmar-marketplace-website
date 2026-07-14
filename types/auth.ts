export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  expiresAt: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};
