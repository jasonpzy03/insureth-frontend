import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { WalletService } from '../../core/services/wallet.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzCardModule,
    NzIconModule,
    NzTypographyModule,
    NzDividerModule
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent {
  walletService = inject(WalletService);
  private router = inject(Router);

  get shortAddress(): string {
    const addr = this.walletService.address();
    if (!addr) return 'Not Connected';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  logout() {
    this.walletService.disconnect();
    this.router.navigate(['/login']);
  }
}
