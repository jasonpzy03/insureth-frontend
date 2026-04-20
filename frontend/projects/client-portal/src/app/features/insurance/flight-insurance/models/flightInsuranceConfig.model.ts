export interface FlightInsuranceProductConfigModel {
  productCode: string;
  basePremiumEth: number;
  premiumBaseRate: number;
  premiumPerDayMultiplier: number;
  premiumDemandMultiplier: number;
  premiumMaxMultiplier: number;
  currency: string;
}

export interface FlightInsuranceExperienceConfigResponse {
  product: FlightInsuranceProductConfigModel;
  supportedAirlines: { name: string; iataCode: string }[];
  supportedAirports: { name: string; iataCode: string }[];
}
