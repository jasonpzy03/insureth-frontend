import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideNzIcons } from 'ng-zorro-antd/icon';
import {
  BankOutline,
  RocketOutline,
  SafetyCertificateOutline
} from '@ant-design/icons-angular/icons';

import { routes } from './app.routes';

registerLocaleData(en);

const icons = [
  BankOutline,
  RocketOutline,
  SafetyCertificateOutline
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideNzI18n(en_US),
    provideNzIcons(icons),
    provideClientHydration(withEventReplay())
  ]
};
