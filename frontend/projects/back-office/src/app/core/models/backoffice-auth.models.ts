export type BackofficeUser = {
  userId: number;
  username: string;
  email: string;
  walletAddress: string;
  role: string;
  roles: string[];
  rights: string[];
};

export type BackofficeUserCreateRequest = {
  username: string;
  email: string;
  walletAddress: string;
  role?: string;
  roles: string[];
};

export type BackofficeRole = {
  roleId: number;
  name: string;
  description: string;
  rights: string[];
};

export type BackofficeNonceResponse = {
  nonce: string;
  expiresAt: string;
  message: string;
};

export type BackofficeAuthResponse = {
  token: string;
  expiresAt: string;
  user: BackofficeUser;
};
