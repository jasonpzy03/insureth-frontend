import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { HeaderComponent } from './core/components/header/header';
import { FooterComponent } from './core/components/footer/footer';
import { TransactionProgressOverlayComponent } from './core/components/transaction-progress-overlay/transaction-progress-overlay.component';
import { SessionTimeoutComponent } from './core/components/session-timeout/session-timeout.component';
import { effect, inject } from '@angular/core';
import { BackofficeAuthService } from './core/services/backoffice-auth.service';
import { IdleService } from './core/services/idle.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    NzLayoutModule, 
    HeaderComponent, 
    FooterComponent, 
    TransactionProgressOverlayComponent,
    SessionTimeoutComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private authService = inject(BackofficeAuthService);
  private idleService = inject(IdleService);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.idleService.startMonitoring();
      } else {
        this.idleService.stopMonitoring();
      }
    });
  }
}
