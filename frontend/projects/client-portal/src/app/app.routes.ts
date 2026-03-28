import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginPage } from './features/auth/pages/login/login';
import {SignupPage} from './features/auth/pages/signup/signup';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/dashboard' },
  { path: 'login', component: LoginPage },
  { path: 'signup', component: SignupPage },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'welcome', loadChildren: () => import('./features/welcome/welcome.routes').then(m => m.WELCOME_ROUTES) },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'insurance', loadComponent: () => import('./features/insurance/insurance').then(m => m.InsuranceComponent) },
      { path: 'claims', loadComponent: () => import('./features/claims/claims').then(m => m.ClaimsComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile').then(m => m.ProfileComponent) }
    ]
  }
];
