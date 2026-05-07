export interface ClientPortalNonceResponse {
  nonce: string;
  expiresAt: string;
  message: string;
}

export interface ClientPortalAuthResponse {
  token: string;
  expiresAt: string;
  profileComplete: boolean;
  walletAddress: string;
}
