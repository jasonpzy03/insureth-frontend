import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {FormBuilder, Validators} from '@angular/forms';
import {WalletService} from '../../../../core/services/wallet.service';
import {AuthService} from '../../services/auth.service';
import {tap} from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
  standalone: false
})
export class LoginPage {
  walletService = inject(WalletService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  authService = inject(AuthService);


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
    this.authService.checkClientUserExists(this.walletService.address()!)
      .pipe(
        // you can process the boolean here if needed
        tap((exists: boolean) => {
          this.walletService.isProfileComplete.set(exists);
          if (exists) {
            localStorage.setItem('insureth_profile_completed', 'true');
            this.router.navigate(['/dashboard'], { replaceUrl: true });
          } else {
            localStorage.removeItem('insureth_profile_completed');
            this.router.navigate(['/signup'], { replaceUrl: true });
          }
        })
      )
      .subscribe(); // triggers the request
  }

}
