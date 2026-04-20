import { Component, OnDestroy, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { EthAmountPipe } from '../../pipes/eth-amount.pipe';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    NzLayoutModule,
    NzMenuModule,
    NzButtonModule,
    NzIconModule,
    NzDropDownModule,
    NzBadgeModule,
    EthAmountPipe
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent implements OnDestroy {
  walletService = inject(WalletService);
  notificationService = inject(NotificationService);
  private router = inject(Router);
  
  private readonly notificationEffect = effect(() => {
    if (this.walletService.isAuthenticated() && this.walletService.isProfileComplete()) {
      this.notificationService.start();
    } else {
      this.notificationService.clear();
    }
  });

  constructor() {
  }

  ngOnDestroy(): void {
    this.notificationEffect.destroy();
    this.notificationService.stop();
  }

  get isLoginPage(): boolean {
    return this.router.url === '/login';
  }

  get hideConnectButton(): boolean {
    const url = this.router.url.split('?')[0]; // ignore query params
    return url === '/login' || url === '/signup' || url === '/auth/verify';
  }

  get shortAddress(): string {
    const addr = this.walletService.address();
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  logout() {
    this.notificationService.clear();
    this.walletService.disconnect();
    this.router.navigate(['/login']);
  }

  onUserMenuVisibleChange(isVisible: boolean): void {
    if (isVisible) {
      void this.walletService.refreshWalletSnapshot();
    }
  }

  openNotification(notification: AppNotification): void {
    this.notificationService.markAsRead(notification.id);
    void this.router.navigate(['/policies', notification.policyId]);
  }

  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead();
  }
}
