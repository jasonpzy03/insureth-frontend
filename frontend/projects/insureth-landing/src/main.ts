import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { loadRuntimeConfig } from './app/runtime-config';

loadRuntimeConfig()
  .catch((error) => console.error('Failed to load landing runtime config.', error))
  .finally(() => {
    bootstrapApplication(App, appConfig)
      .catch((err) => console.error(err));
  });
