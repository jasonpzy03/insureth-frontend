import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { BackofficeUser, BackofficeUserCreateRequest } from '../../core/models/backoffice-auth.models';
import { BackofficeUserManagementService } from '../../core/services/backoffice-user-management.service';

@Component({
  selector: 'app-backoffice-users-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzTableModule
  ],
  templateUrl: './users.html',
  styleUrl: './users.scss'
})
export class BackofficeUsersPage {
  private readonly fb = inject(FormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly userManagementService = inject(BackofficeUserManagementService);

  readonly users = signal<BackofficeUser[]>([]);
  readonly isLoading = signal(false);
  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly roleOptions = ['ADMIN', 'OPERATOR', 'REVIEWER'];

  readonly createUserForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    walletAddress: ['', [Validators.required]],
    role: ['OPERATOR', [Validators.required]]
  });

  constructor() {
    void this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const users = await this.userManagementService.listUsers();
      this.users.set(users);
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.error?.error || 'Unable to load backoffice users.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.createUserForm.invalid) {
      this.createUserForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      const payload: BackofficeUserCreateRequest = {
        username: this.createUserForm.controls.username.value.trim(),
        email: this.createUserForm.controls.email.value.trim(),
        walletAddress: this.createUserForm.controls.walletAddress.value.trim(),
        role: this.createUserForm.controls.role.value
      };

      const createdUser = await this.userManagementService.createUser(payload);
      this.users.update(users => [createdUser, ...users]);
      this.createUserForm.reset({
        username: '',
        email: '',
        walletAddress: '',
        role: 'OPERATOR'
      });
      this.message.success('Backoffice user created successfully.');
    } catch (error: any) {
      this.error.set(error?.error?.message || error?.error?.error || 'Unable to create backoffice user.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
