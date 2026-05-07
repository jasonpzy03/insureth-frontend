import { ApplicationConfig, importProvidersFrom, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import {
  DownOutline,
  DashboardOutline,
  GithubOutline,
  LinkedinOutline,
  LockOutline,
  LogoutOutline,
  SafetyCertificateOutline,
  TwitterOutline,
  UserOutline
  ,
  WalletOutline
} from '@ant-design/icons-angular/icons';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';

registerLocaleData(en);

const icons = [
  DashboardOutline,
  DownOutline,
  GithubOutline,
  LinkedinOutline,
  LockOutline,
  LogoutOutline,
  SafetyCertificateOutline,
  TwitterOutline,
  UserOutline,
  WalletOutline
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
    provideAnimations(),
    provideNzI18n(en_US),
    provideNzIcons(icons),
    importProvidersFrom(NzModalModule)
  ]
};
