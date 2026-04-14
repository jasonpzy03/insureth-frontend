import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { WalletService } from '../../../../core/services/wallet.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
  standalone: false
})
export class LoginPage {
  walletService = inject(WalletService);
  private router = inject(Router);


  constructor() {
    this.checkInitialConnection();
  }

  private async checkInitialConnection() {
    await this.walletService.initialized;
    if (this.walletService.isAuthenticated()) {
      this.handleAuthenticatedRouting();
    }
  }

  async connectWallet() {
    await this.walletService.connect();
    if (this.walletService.isAuthenticated()) {
      this.handleAuthenticatedRouting();
    }
  }

  private handleAuthenticatedRouting() {
    if (this.walletService.isProfileComplete()) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    } else {
      localStorage.removeItem('insureth_profile_completed');
      this.router.navigate(['/signup'], { replaceUrl: true });
    }
  }

}
