export type Account = {
  providerId: string;
  accessToken: string | null;
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  accountId: string;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  password: string | null;
};
