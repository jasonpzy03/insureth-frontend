import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { WalletService } from '../../../../core/services/wallet.service';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
  standalone: false
})
export class LoginPage implements OnInit {
  walletService = inject(WalletService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private message = inject(NzMessageService);


  ngOnInit() {
    this.checkInitialConnection();
    
    // Show session expired message if redirected
    const params = this.route.snapshot.queryParamMap;
    if (params.get('expired') === 'true') {
      // Clear query params immediately so the message doesn't persist on refresh
      this.router.navigate([], { 
        queryParams: { expired: null }, 
        queryParamsHandling: 'merge',
        replaceUrl: true 
      });
      this.message.warning('Session expired. Please log in again.', { nzDuration: 5000 });
    }
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
