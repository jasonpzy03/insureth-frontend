import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { BackofficeAuthService } from '../../../../core/services/backoffice-auth.service';
import { WalletService } from '../../../../core/services/wallet.service';

@Component({
  selector: 'app-backoffice-login',
  standalone: true,
  imports: [
    CommonModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class BackofficeLoginPage {
  readonly authService = inject(BackofficeAuthService);
  readonly walletService = inject(WalletService);
  private readonly router = inject(Router);

  constructor() {
    this.redirectIfAuthenticated();
  }

  private async redirectIfAuthenticated() {
    await this.authService.initialized;
    if (this.authService.isAuthenticated()) {
      await this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  async connectWallet() {
    try {
      await this.authService.loginWithWallet();
      await this.router.navigate(['/dashboard'], { replaceUrl: true });
    } catch {
      // Error state is handled by the auth service signal.
    }
  }
}
