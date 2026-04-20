import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterOutlet, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { HeaderComponent } from './core/components/header/header';
import { FooterComponent } from './core/components/footer/footer';
import { AuthModule } from './features/auth/auth.module';
import { InsuranceModule } from './features/insurance/insurance.module';
import { IdleService } from './core/services/idle.service';
import { WalletService } from './core/services/wallet.service';
import { SessionTimeoutComponent } from './core/components/session-timeout/session-timeout.component';
import { effect } from '@angular/core';
import { TransactionProgressOverlayComponent } from './core/components/transaction-progress-overlay/transaction-progress-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NzLayoutModule,
    NzBreadCrumbModule,
    HeaderComponent,
    FooterComponent,
    AuthModule,
    InsuranceModule,
    SessionTimeoutComponent,
    TransactionProgressOverlayComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  showBreadcrumbs = true;

  constructor(
    private router: Router, 
    private activatedRoute: ActivatedRoute,
    private idleService: IdleService,
    private walletService: WalletService
  ) {
    // Start/Stop idle monitoring based on authentication state
    effect(() => {
      if (this.walletService.isAuthenticated()) {
        this.idleService.startMonitoring();
      } else {
        this.idleService.stopMonitoring();
      }
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      }),
      filter(route => route.outlet === 'primary'),
      mergeMap(route => route.data)
    ).subscribe(data => {
      // Hide if the route explicitly sets hideBreadcrumb: true
      this.showBreadcrumbs = data['hideBreadcrumb'] !== true;
    });
  }
}
