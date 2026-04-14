import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginPage } from './features/auth/pages/login/login';
import { SignupPage } from './features/auth/pages/signup/signup';
import { FlightInsuranceLandingPage } from './features/insurance/flight-insurance/pages/flight-insurance-landing/flight-insurance-landing';
import { PurchasePage } from './features/insurance/flight-insurance/pages/purchase/purchase';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/dashboard' },
  { path: 'login', component: LoginPage, data: { breadcrumb: 'Login', hideBreadcrumb: true } },
  { path: 'signup', component: SignupPage, data: { breadcrumb: 'Sign Up', hideBreadcrumb: true } },
  {
    path: '',
    canActivate: [authGuard],
    data: { breadcrumb: 'Home' },
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.DashboardComponent), data: { breadcrumb: 'Dashboard', hideBreadcrumb: true } },
      {
        path: 'insurance',
        data: { breadcrumb: 'Insurance' },
        children: [
          { path: '', redirectTo: 'flight-insurance', pathMatch: 'full' },
          {
            path: 'flight-insurance',
            data: { breadcrumb: 'Flight Insurance' },
            children: [
              { path: '', component: FlightInsuranceLandingPage },
              { path: 'purchase', component: PurchasePage, data: { breadcrumb: 'Purchase' } }
            ]
          }
        ]
      },
      {
        path: 'investor',
        data: { breadcrumb: 'Investor' },
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            data: { breadcrumb: 'Dashboard' },
            children: [
              { path: '', loadComponent: () => import('./features/investor/dashboard/dashboard.component').then(m => m.InvestorDashboardComponent) },
              { path: 'transactions', loadComponent: () => import('./features/investor/transactions/transactions.component').then(m => m.InvestorTransactionsComponent), data: { breadcrumb: 'Transactions' } }
            ]
          },
          { path: 'pools', loadComponent: () => import('./features/investor/pools/pools.component').then(m => m.InvestorPoolsComponent), data: { breadcrumb: 'Risk Pools' } },
          { path: 'pools/:poolId/transactions', loadComponent: () => import('./features/investor/pool-transactions/pool-transactions.component').then(m => m.PoolTransactionsComponent), data: { breadcrumb: 'Pool Transactions' } },
          { path: 'transactions', redirectTo: '/investor/dashboard/transactions', pathMatch: 'full' }
        ]
      },
      { path: 'policies', loadComponent: () => import('./features/policies/policies').then(m => m.PoliciesComponent), data: { breadcrumb: 'Policies', hideBreadcrumb: true } },
      { path: 'policies/:id', loadComponent: () => import('./features/policies/policy-detail/policy-detail').then(m => m.PolicyDetailComponent), data: { breadcrumb: 'Policy Detail', hideBreadcrumb: true } },
      { path: 'profile', loadComponent: () => import('./features/profile/profile').then(m => m.ProfileComponent), data: { breadcrumb: 'Profile', hideBreadcrumb: true } }
    ]
  }
];
