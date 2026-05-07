import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { WalletService } from '../services/wallet.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const walletService = inject(WalletService);
  const token = walletService.authToken();

  if (!token) {
    return next(req);
  }

  return next(req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  }));
};
