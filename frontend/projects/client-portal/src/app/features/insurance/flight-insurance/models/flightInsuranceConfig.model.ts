export interface FlightInsuranceProductConfigModel {
  productCode: string;
  basePremiumEth: number;
  delayPayoutTier1Eth: number;
  delayPayoutTier2Eth: number;
  delayPayoutTier3Eth: number;
  cancellationPayoutEth: number;
  delayThresholdTier1Minutes: number;
  delayThresholdTier2Minutes: number;
  delayThresholdTier3Minutes: number;
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
