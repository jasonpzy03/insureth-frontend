import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginPage } from './features/auth/pages/login/login';
import { SignupPage } from './features/auth/pages/signup/signup';
import { FlightInsurancePage } from './features/insurance/pages/flight-insurance/flight-insurance';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/dashboard' },
  { path: 'login', component: LoginPage },
  { path: 'signup', component: SignupPage },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent) },
      {
        path: 'insurance',
        children: [
          { path: 'flight-insurance', component: FlightInsurancePage }
        ]
      },
      { path: 'claims', loadComponent: () => import('./features/claims/claims').then(m => m.ClaimsComponent) },
      { path: 'profile', loadComponent: () => import('./features/profile/profile').then(m => m.ProfileComponent) }
    ]
  }
];
