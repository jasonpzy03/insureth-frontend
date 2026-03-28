import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { WalletService } from '../services/wallet.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const walletService = inject(WalletService);
  const router = inject(Router);

  // Wait for initial wallet check to finish
  await walletService.initialized;

  if (walletService.isAuthenticated()) {
    if (walletService.isProfileComplete()) {
      return true;
    }
    // Authenticated but profile not complete
    return router.createUrlTree(['/signup']);
  }

  // Redirect to login page
  return router.createUrlTree(['/login']);
};
