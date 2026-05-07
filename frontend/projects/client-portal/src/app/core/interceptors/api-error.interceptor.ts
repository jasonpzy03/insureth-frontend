import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, throwError, EMPTY } from 'rxjs';
import { WalletService } from '../services/wallet.service';
import { Router } from '@angular/router';

export const SKIP_GLOBAL_API_ERROR = new HttpContextToken<boolean>(() => false);
let isRedirecting = false;

export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const message = inject(NzMessageService);
  const walletService = inject(WalletService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      const err = error as any;
      const status = error instanceof HttpErrorResponse ? error.status : err.status;

      // Session expiration (401/403) should NEVER be skipped.
      if (status === 401 || status === 403) {
        if (!isRedirecting) {
          isRedirecting = true;
          walletService.disconnect();
          window.location.href = '/login?expired=true';
        }
        return EMPTY; 
      }

      if (req.context.get(SKIP_GLOBAL_API_ERROR)) {
        return throwError(() => error);
      }

      if (error instanceof HttpErrorResponse) {
        message.error(extractApiErrorMessage(error), { nzDuration: 5000 });
      }

      return throwError(() => error);
    })
  );
};

function extractApiErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Unable to reach the server. Please check your connection and try again.';
  }

  const payload = error.error;
  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  if (payload && typeof payload === 'object') {
    const directMessage = payload['message'];
    if (typeof directMessage === 'string' && directMessage.trim()) {
      return directMessage;
    }

    const directError = payload['error'];
    if (typeof directError === 'string' && directError.trim()) {
      return directError;
    }

    const errors = payload['errors'];
    if (Array.isArray(errors) && errors.length > 0) {
      return errors.join('; ');
    }
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return 'Request failed. Please try again.';
}
