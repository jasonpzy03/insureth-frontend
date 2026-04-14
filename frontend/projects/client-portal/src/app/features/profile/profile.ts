import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { HttpContext } from '@angular/common/http';
import { WalletService } from '../../core/services/wallet.service';
import { AuthService } from '../auth/services/auth.service';
import { finalize } from 'rxjs';
import { SKIP_GLOBAL_API_ERROR } from '../../core/interceptors/api-error.interceptor';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzTypographyModule,
    NzDividerModule,
    NzFormModule,
    NzInputModule,
    NzSpinModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit {
  walletService = inject(WalletService);
  private router = inject(Router);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);

  profileForm!: FormGroup;
  isLoading = true;
  isSaving = false;

  get shortAddress(): string {
    const addr = this.walletService.address();
    if (!addr) return 'Not Connected';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  ngOnInit() {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });

    this.loadProfile();
  }

  loadProfile() {
    const address = this.walletService.address();
    if (!address) {
      this.isLoading = false;
      return;
    }

    this.authService.getClientUser(address).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (user) => {
        this.profileForm.patchValue({
          username: user.username,
          email: user.email
        });
      },
      error: () => {
        this.message.error('Failed to load profile');
      }
    });
  }

  submit() {
    if (this.profileForm.valid) {
      const address = this.walletService.address();
      if (!address) return;

      this.isSaving = true;
      const data = {
        walletAddress: address,
        username: this.profileForm.value.username,
        email: this.profileForm.value.email
      };

      this.authService.updateClientUser(
        address,
        data,
        new HttpContext().set(SKIP_GLOBAL_API_ERROR, true)
      ).pipe(
        finalize(() => this.isSaving = false)
      ).subscribe({
        next: () => {
          this.message.success('Profile updated successfully!');
        },
        error: (err) => {
          const errorMessage = err.error?.message || 'Failed to update profile';
          this.message.error(errorMessage);
        }
      });
    } else {
      Object.values(this.profileForm.controls).forEach(control => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  logout() {
    this.walletService.disconnect();
    this.router.navigate(['/login']);
  }
}
