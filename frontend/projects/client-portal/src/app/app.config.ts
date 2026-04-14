import {ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideClientHydration, withEventReplay} from '@angular/platform-browser';
import {provideHttpClient, withInterceptors} from '@angular/common/http';

import {provideAnimations} from '@angular/platform-browser/animations';

import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import {
  ArrowLeftOutline,
  BankOutline,
  ClockCircleOutline,
  CloseCircleOutline,
  DashboardOutline,
  DownOutline,
  DownloadOutline,
  FilterOutline,
  GithubOutline,
  HistoryOutline,
  InfoCircleFill,
  InfoCircleOutline,
  LinkOutline,
  LinkedinOutline,
  LogoutOutline,
  PlusOutline,
  ReloadOutline,
  RocketOutline,
  SafetyCertificateFill,
  SafetyCertificateOutline,
  SaveOutline,
  SearchOutline,
  SendOutline,
  ShoppingCartOutline,
  SwapOutline,
  SwapRightOutline,
  TwitterOutline,
  UserOutline,
  WalletOutline,
  WarningFill
} from '@ant-design/icons-angular/icons';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { apiErrorInterceptor } from './core/interceptors/api-error.interceptor';
registerLocaleData(en);

const icons = [
  ArrowLeftOutline,
  BankOutline,
  ClockCircleOutline,
  CloseCircleOutline,
  DashboardOutline,
  DownOutline,
  DownloadOutline,
  FilterOutline,
  GithubOutline,
  HistoryOutline,
  InfoCircleFill,
  InfoCircleOutline,
  LinkOutline,
  LinkedinOutline,
  LogoutOutline,
  PlusOutline,
  ReloadOutline,
  RocketOutline,
  SafetyCertificateFill,
  SafetyCertificateOutline,
  SaveOutline,
  SearchOutline,
  SendOutline,
  ShoppingCartOutline,
  SwapOutline,
  SwapRightOutline,
  TwitterOutline,
  UserOutline,
  WalletOutline,
  WarningFill
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes), provideClientHydration(withEventReplay()),
    provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
    provideAnimations(),
    provideNzI18n(en_US),
    provideNzIcons(icons)
  ]
};
