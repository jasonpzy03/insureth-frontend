export type BackofficeUser = {
  userId: number;
  username: string;
  email: string;
  walletAddress: string;
  role: string;
};

export type BackofficeUserCreateRequest = {
  username: string;
  email: string;
  walletAddress: string;
  role: string;
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
