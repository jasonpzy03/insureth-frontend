import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BackofficeAuthService } from '../services/backoffice-auth.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(BackofficeAuthService);
  const router = inject(Router);

  await authService.initialized;

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
