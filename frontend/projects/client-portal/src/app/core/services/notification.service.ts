import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { WalletService } from './wallet.service';
import { API } from '../constants/api.constants';

export type AppNotification = {
  id: string;
  policyId: number;
  type: 'POLICY_PURCHASED' | 'PAYOUT_DISTRIBUTED';
  title: string;
  message: string;
  timestamp: number;
  amountEth?: string;
};

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private static readonly LOAD_GUARD_TIMEOUT_MS = 10000;
  private readonly walletService = inject(WalletService);
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl =
    API.GATEWAY + '/' +
    API.BASE_URL + '/' +
    API.INSURANCE + '/' +
    API.FLIGHT_INSURANCE + '/notifications';

  private readonly readStoragePrefix = 'insureth_notification_reads';
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private activeRefreshToken = 0;
  private activeWalletKey: string | null = null;

  readonly notifications = signal<AppNotification[]>([]);
  readonly isLoading = signal(false);
  readonly hasLoaded = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly unreadCount = computed(() =>
    this.notifications().filter((notification) => !this.isRead(notification.id)).length
  );

  start(): void {
    const walletKey = this.walletService.address()?.toLowerCase() ?? null;
    if (this.refreshTimer && this.activeWalletKey === walletKey) {
      return;
    }

    this.stop();
    this.activeWalletKey = walletKey;
    void this.refresh();
    this.refreshTimer = setInterval(() => {
      void this.refresh();
    }, 60000);
  }

  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.activeWalletKey = null;
  }

  clear(): void {
    this.stop();
    this.isLoading.set(false);
    this.hasLoaded.set(false);
    this.loadError.set(null);
    this.notifications.set([]);
  }

  async refresh(): Promise<void> {
    if (!this.walletService.isAuthenticated() || !this.walletService.isProfileComplete()) {
      this.isLoading.set(false);
      this.hasLoaded.set(false);
      this.loadError.set(null);
      this.notifications.set([]);
      return;
    }

    if (this.isLoading()) {
      return;
    }

    const refreshToken = ++this.activeRefreshToken;
    this.isLoading.set(true);
    this.loadError.set(null);

    const loadingGuard = setTimeout(() => {
      if (this.activeRefreshToken !== refreshToken) {
        return;
      }

      console.warn('Notification refresh guard released a stuck loading state.');
      this.isLoading.set(false);
      this.hasLoaded.set(true);
      this.loadError.set('Notifications are temporarily unavailable.');
    }, NotificationService.LOAD_GUARD_TIMEOUT_MS);

    try {
      const items = await this.fetchNotifications();

      this.notifications.set(items);
      this.hasLoaded.set(true);
    } catch (error) {
      console.error('Failed to refresh notifications', error);
      this.notifications.set([]);
      this.hasLoaded.set(true);
      this.loadError.set('Notifications are temporarily unavailable.');
    } finally {
      clearTimeout(loadingGuard);
      if (this.activeRefreshToken === refreshToken) {
        this.isLoading.set(false);
      }
    }
  }

  markAsRead(id: string): void {
    const readIds = this.getReadIds();
    if (!readIds.includes(id)) {
      readIds.push(id);
      this.saveReadIds(readIds);
      this.notifications.update((items) => [...items]);
    }
  }

  markAllAsRead(): void {
    const ids = this.notifications().map((notification) => notification.id);
    this.saveReadIds(ids);
    this.notifications.update((items) => [...items]);
  }

  isRead(id: string): boolean {
    return this.getReadIds().includes(id);
  }

  private getReadIds(): string[] {
    const address = this.walletService.address();
    if (!address) {
      return [];
    }

    try {
      const raw = localStorage.getItem(`${this.readStoragePrefix}:${address.toLowerCase()}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveReadIds(ids: string[]): void {
    const address = this.walletService.address();
    if (!address) {
      return;
    }

    localStorage.setItem(
      `${this.readStoragePrefix}:${address.toLowerCase()}`,
      JSON.stringify(Array.from(new Set(ids)))
    );
  }

  private async fetchNotifications(): Promise<AppNotification[]> {
    const payload = await firstValueFrom(this.http.get<{
      id: string;
      policyId: number;
      type: 'POLICY_PURCHASED' | 'PAYOUT_DISTRIBUTED';
      title: string;
      message: string;
      timestamp: string;
      amountEth?: string | null;
    }[]>(this.apiBaseUrl, {
      params: { limit: '20' },
      headers: this.buildHeaders()
    }));

    return payload.map((item) => ({
      id: item.id,
      policyId: item.policyId,
      type: item.type,
      title: item.title,
      message: item.message,
      timestamp: Date.parse(item.timestamp),
      amountEth: item.amountEth ?? undefined
    }));
  }

  private buildHeaders(): Record<string, string> {
    const token = this.walletService.authToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}
