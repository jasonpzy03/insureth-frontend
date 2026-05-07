export interface FlightInsurancePricingConfigModel {
  productCode: string;
  basePremiumEth: number;
  premiumBaseRate: number;
  premiumPerDayMultiplier: number;
  premiumDemandMultiplier: number;
  premiumMaxMultiplier: number;
  currency: string;
}

export interface FlightInsurancePricingConfigResponse {
  product: FlightInsurancePricingConfigModel;
}

export interface FlightInsurancePricingConfigRequest {
  product: FlightInsurancePricingConfigModel;
}

export interface AdminPagedResponse<T> {
  items: T[];
  totalElements: number;
  page: number;
  size: number;
}

export interface FlightInsuranceAdminAirlineModel {
  airlineId: number;
  name: string;
  iataCode: string;
  icaoCode: string;
  supportedForFlightInsurance: boolean;
}

export interface FlightInsuranceAdminAirportModel {
  airportId: number;
  name: string;
  iataCode: string;
  icaoCode: string;
  timezone: string;
  countryCode: string;
  supportedForFlightInsurance: boolean;
}

export interface FlightInsuranceAirlineUpdateRequest {
  name: string;
  iataCode: string;
  icaoCode: string;
  supportedForFlightInsurance: boolean;
}

export interface FlightInsuranceAirportUpdateRequest {
  name: string;
  iataCode: string;
  icaoCode: string;
  timezone: string;
  supportedForFlightInsurance: boolean;
}
