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

    this.authService.createClientUser({
      walletAddress: this.walletService.address()!,
      username: formValue.username!,
      email: formValue.email!
    })
      .pipe(
        tap((res) => {
          // assuming success = user created
          this.walletService.isProfileComplete.set(true);
          localStorage.setItem('insureth_profile_completed', 'true');

          this.router.navigate(['/dashboard'], { replaceUrl: true });
        })
      )
      .subscribe({
        error: (err) => {
          console.error('Create user failed:', err);

          // optional UX improvement
          // show error message here (NzAlert, toast, etc.)
        }
      });
  }
}
