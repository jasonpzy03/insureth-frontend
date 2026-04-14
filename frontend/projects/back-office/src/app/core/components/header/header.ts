import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { BackofficeAuthService } from '../../services/backoffice-auth.service';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    NzLayoutModule,
    NzMenuModule,
    NzButtonModule,
    NzIconModule,
    NzDropDownModule
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class HeaderComponent {
  readonly walletService = inject(WalletService);
  readonly authService = inject(BackofficeAuthService);
  private readonly router = inject(Router);

  get isLoginPage(): boolean {
    return this.router.url === '/login';
  }

  get shortAddress(): string {
    const addr = this.walletService.address();
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  async navigate(path: string) {
    await this.router.navigateByUrl(path);
  }

  async logout() {
    this.authService.logout();
    await this.router.navigate(['/login']);
  }
}
