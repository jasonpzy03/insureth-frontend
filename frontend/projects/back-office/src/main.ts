import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { loadRuntimeConfig } from './app/core/config/runtime-config';

loadRuntimeConfig()
  .catch((error) => console.error('Failed to load back-office runtime config.', error))
  .finally(() => {
    bootstrapApplication(App, appConfig)
      .catch((err) => console.error(err));
  });
