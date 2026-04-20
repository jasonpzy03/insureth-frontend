import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/dashboard' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login').then(m => m.BackofficeLoginPage)
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.BackofficeDashboardPage)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users').then(m => m.BackofficeUsersPage)
      },
      {
        path: 'policy-operations',
        loadComponent: () => import('./features/policy-operations/policy-operations').then(m => m.PolicyOperationsPage)
      },
      {
        path: 'audit-trail/auth',
        loadComponent: () => import('./features/audit-auth/audit-auth').then(m => m.AuditAuthPage)
      },
      {
        path: 'audit-trail/insurance',
        loadComponent: () => import('./features/audit-insurance/audit-insurance').then(m => m.AuditInsurancePage)
      },
      {
        path: 'insurance-config/flight-insurance/pricing-payouts',
        loadComponent: () => import('./features/insurance-config/insurance-config').then(m => m.InsuranceConfigPage)
      },
      {
        path: 'insurance-config/flight-insurance/airlines',
        loadComponent: () => import('./features/insurance-airlines/insurance-airlines').then(m => m.InsuranceAirlinesPage)
      },
      {
        path: 'insurance-config/flight-insurance/airlines/:airlineId',
        loadComponent: () => import('./features/insurance-airline-detail/insurance-airline-detail').then(m => m.InsuranceAirlineDetailPage)
      },
      {
        path: 'insurance-config/flight-insurance/airports',
        loadComponent: () => import('./features/insurance-airports/insurance-airports').then(m => m.InsuranceAirportsPage)
      },
      {
        path: 'insurance-config/flight-insurance/airports/:airportId',
        loadComponent: () => import('./features/insurance-airport-detail/insurance-airport-detail').then(m => m.InsuranceAirportDetailPage)
      },
      {
        path: 'contract-admin',
        loadComponent: () => import('./features/contract-admin/contract-admin').then(m => m.ContractAdminPage)
      }
    ]
  }
];
