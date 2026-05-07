import { getRuntimeConfig } from '../config/runtime-config';

const getGatewayUrl = (): string => getRuntimeConfig().gatewayUrl;

export const API = {
  get GATEWAY() {
    return getGatewayUrl();
  },
  PREFIX: 'api',
  VERSION: 'v1',
  BASE_URL: 'api/v1',


  AUTH: 'auth',
  CP_USERS: 'cp-users',
  CLIENT: 'client',

  INSURANCE: 'insurance',
  FLIGHT_INSURANCE: 'flightinsurance'
};
