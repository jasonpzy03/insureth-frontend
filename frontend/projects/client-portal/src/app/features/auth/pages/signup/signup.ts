import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { WalletService } from '../../../../core/services/wallet.service';
import { AuthService } from '../../services/auth.service';
import {tap} from 'rxjs';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.html',
  styleUrl: './signup.scss',
  standalone: false
})
export class SignupPage {
  walletService = inject(WalletService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  awaitingVerification = false;


  profileForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    terms: [false, [Validators.requiredTrue]]
  });

  constructor() {
    this.checkAccess();
  }

  private async checkAccess() {
    await this.walletService.initialized;
    if (!this.walletService.isAuthenticated()) {
      this.router.navigate(['/login'], { replaceUrl: true });
    } else if (this.walletService.isProfileComplete()) {
      this.router.navigate(['/dashboard'], { replaceUrl: true });
    }
  }

  submitProfile() {
    if (this.profileForm.invalid) {
      Object.values(this.profileForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const formValue = this.profileForm.value;

    this.authService.initiateSignupClientUser({
      walletAddress: this.walletService.address()!,
      username: formValue.username!,
      email: formValue.email!
    })
      .pipe(
        tap((res) => {
          this.awaitingVerification = true;
        })
      )
      .subscribe({
        error: () => {}
      });
  }
}
