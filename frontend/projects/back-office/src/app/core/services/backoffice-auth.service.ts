import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API } from '../constants/api.constants';
import { BackofficeAuthResponse, BackofficeNonceResponse, BackofficeUser } from '../models/backoffice-auth.models';
import { WalletService } from './wallet.service';

@Injectable({
  providedIn: 'root'
})
export class BackofficeAuthService {
  private readonly http = inject(HttpClient);
  private readonly walletService = inject(WalletService);
  private readonly tokenStorageKey = 'insureth_backoffice_auth_token';

  readonly token = signal<string | null>(null);
  readonly user = signal<BackofficeUser | null>(null);
  readonly expiresAt = signal<string | null>(null);
  readonly isLoading = signal<boolean>(false);
  readonly isInitialized = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly isAuthenticated = computed(() => !!this.token() && !!this.user());

  private initializedResolve: (() => void) | null = null;
  readonly initialized = new Promise<void>((resolve) => {
    this.initializedResolve = resolve;
  });

  constructor() {
    void this.hydrateSession();
  }

  private async hydrateSession() {
    await this.walletService.initialized;

    const token = localStorage.getItem(this.tokenStorageKey);
    const walletAddress = this.walletService.address();
    if (!token || !walletAddress) {
      this.finishInit();
      return;
    }

    try {
      if (this.getTokenSubject(token)?.toLowerCase() !== walletAddress.toLowerCase()) {
        this.clearSession();
      } else {
        this.token.set(token);
        await this.refreshCurrentUser();
      }
    } catch {
      this.clearSession();
    } finally {
      this.finishInit();
    }
  }

  private finishInit() {
    this.isInitialized.set(true);
    this.initializedResolve?.();
  }

  async requestNonce(walletAddress: string): Promise<BackofficeNonceResponse> {
    return firstValueFrom(this.http.post<BackofficeNonceResponse>(
      `${API.AUTH_BASE_URL}/${API.BACKOFFICE}/nonce`,
      { walletAddress }
    ));
  }

  async loginWithWallet(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const connectedAddress = await this.walletService.connect();
      const walletAddress = connectedAddress || this.walletService.address();
      if (!walletAddress) {
        throw new Error('Wallet connection is required');
      }

      const noncePayload = await this.requestNonce(walletAddress);
      const signer = await this.walletService.getSigner();
      if (!signer) {
        throw new Error('Wallet signer is not available');
      }

      const message = noncePayload.message;
      const signature = await signer.signMessage(message);
      const response = await firstValueFrom(this.http.post<BackofficeAuthResponse>(
        `${API.AUTH_BASE_URL}/${API.BACKOFFICE}/login`,
        {
          walletAddress,
          signature,
          nonce: noncePayload.nonce,
          message
        }
      ));

      this.persistSession(response);
    } catch (error: any) {
      this.clearSession();
      this.error.set(error?.error?.message || error?.error?.error || 'Backoffice login failed');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async refreshCurrentUser(): Promise<void> {
    if (!this.token()) {
      return;
    }

    try {
      const user = await firstValueFrom(this.http.get<BackofficeUser>(
        `${API.AUTH_BASE_URL}/${API.BACKOFFICE}/me`
      ));
      this.user.set(user);
    } catch {
      this.clearSession();
    }
  }

  logout() {
    this.clearSession();
    this.walletService.disconnect();
  }

  private persistSession(response: BackofficeAuthResponse) {
    this.token.set(response.token);
    this.expiresAt.set(response.expiresAt);
    this.user.set(response.user);
    localStorage.setItem(this.tokenStorageKey, response.token);
  }

  private clearSession() {
    localStorage.removeItem(this.tokenStorageKey);
    this.token.set(null);
    this.user.set(null);
    this.expiresAt.set(null);
  }

  private getTokenSubject(token: string): string | null {
    try {
      const [, payload] = token.split('.');
      if (!payload) return null;
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return decoded?.sub ?? null;
    } catch {
      return null;
    }
  }
}
