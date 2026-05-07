export type RuntimeConfig = {
  gatewayUrl: string;
  clientPortalUrl: string;
  backOfficeUrl: string;
  landingUrl: string;
};

const DEFAULT_CONFIG: RuntimeConfig = {
  gatewayUrl: 'http://localhost:8080',
  clientPortalUrl: 'http://localhost:4200',
  backOfficeUrl: 'http://localhost:4300',
  landingUrl: 'http://localhost:4400'
};

let runtimeConfig: RuntimeConfig = { ...DEFAULT_CONFIG };

function normalizeUrl(url: string | undefined, fallback: string): string {
  return (url || fallback).replace(/\/+$/, '');
}

export async function loadRuntimeConfig(): Promise<void> {
  try {
    const response = await fetch('/app-config.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load app-config.json: ${response.status}`);
    }

    const loaded = (await response.json()) as Partial<RuntimeConfig>;
    runtimeConfig = {
      gatewayUrl: normalizeUrl(loaded.gatewayUrl, DEFAULT_CONFIG.gatewayUrl),
      clientPortalUrl: normalizeUrl(loaded.clientPortalUrl, DEFAULT_CONFIG.clientPortalUrl),
      backOfficeUrl: normalizeUrl(loaded.backOfficeUrl, DEFAULT_CONFIG.backOfficeUrl),
      landingUrl: normalizeUrl(loaded.landingUrl, DEFAULT_CONFIG.landingUrl)
    };
  } catch (error) {
    console.warn('Using default client portal runtime config.', error);
    runtimeConfig = { ...DEFAULT_CONFIG };
  }
}

export function getRuntimeConfig(): RuntimeConfig {
  return runtimeConfig;
}
