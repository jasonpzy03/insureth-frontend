import { getRuntimeConfig } from '../config/runtime-config';

const getGatewayUrl = (): string => getRuntimeConfig().gatewayUrl;

export const API = {
  get AUTH_BASE_URL() {
    return `${getGatewayUrl()}/api/v1/auth`;
  },
  get INSURANCE_BASE_URL() {
    return `${getGatewayUrl()}/api/v1/insurance`;
  },
  BACKOFFICE: 'backoffice'
};
