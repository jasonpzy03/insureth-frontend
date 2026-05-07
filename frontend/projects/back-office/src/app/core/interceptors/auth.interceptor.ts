import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BackofficeAuthService } from '../services/backoffice-auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(BackofficeAuthService);
  const token = authService.token();

  if (!token) {
    return next(req);
  }

  return next(req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  }));
};
