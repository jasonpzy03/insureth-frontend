import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzMessageService } from 'ng-zorro-antd/message';
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
    NzIconModule,
    NzTypographyModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class BackofficeLoginPage implements OnInit {
  readonly authService = inject(BackofficeAuthService);
  readonly walletService = inject(WalletService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly message = inject(NzMessageService);

  ngOnInit() {
    this.redirectIfAuthenticated();
    this.checkExpiredSession();
  }

  private checkExpiredSession() {
    const params = this.route.snapshot.queryParamMap;
    if (params.get('expired') === 'true') {
      // Clear query params immediately
      this.router.navigate([], { 
        queryParams: { expired: null }, 
        queryParamsHandling: 'merge',
        replaceUrl: true 
      });
      this.message.warning('Session expired. Please log in again.', { nzDuration: 5000 });
    }
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
