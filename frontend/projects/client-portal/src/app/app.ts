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
    InsuranceModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  showBreadcrumbs = true;

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
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
