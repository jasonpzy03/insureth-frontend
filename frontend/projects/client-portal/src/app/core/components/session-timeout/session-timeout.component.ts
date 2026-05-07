import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { IdleService } from '../../services/idle.service';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-session-timeout',
  standalone: true,
  imports: [CommonModule, NzModalModule, NzButtonModule, NzIconModule],
  template: `
    <nz-modal
      [(nzVisible)]="isVisible"
      nzTitle="Session Expiring"
      [nzClosable]="false"
      [nzMaskClosable]="false"
      [nzFooter]="null"
      nzCentered
    >
      <ng-container *nzModalContent>
        <div class="flex flex-col items-center text-center p-4">
          <div class="bg-amber-50 p-4 rounded-full mb-4">
            <span nz-icon nzType="clock-circle" nzTheme="outline" class="text-4xl text-amber-500"></span>
          </div>
          
          <h3 class="text-xl font-bold text-gray-800 mb-2">Are you still there?</h3>
          <p class="text-gray-500 mb-6">
            Your session is about to expire due to inactivity. You will be logged out in:
          </p>
          
          <div class="text-5xl font-black text-[#8732fb] mb-8 tabular-nums">
            {{ countdown }}s
          </div>
          
          <div class="flex gap-3 w-full">
            <button nz-button nzType="default" nzBlock class="h-12 font-bold rounded-xl" (click)="logout()">
              Logout
            </button>
            <button nz-button nzType="primary" nzBlock class="h-12 font-bold rounded-xl bg-[#8732fb] border-[#8732fb]" (click)="extend()">
              Extend Session
            </button>
          </div>
        </div>
      </ng-container>
    </nz-modal>
  `
})
export class SessionTimeoutComponent {
  private idleService = inject(IdleService);
  private walletService = inject(WalletService);

  get isVisible() {
    return this.idleService.isIdleWarningActive();
  }

  get countdown() {
    return this.idleService.countdownSeconds();
  }

  extend() {
    this.idleService.resetTimer();
  }

  logout() {
    this.idleService.stopMonitoring();
    this.walletService.disconnect();
    window.location.href = '/login';
  }
}
