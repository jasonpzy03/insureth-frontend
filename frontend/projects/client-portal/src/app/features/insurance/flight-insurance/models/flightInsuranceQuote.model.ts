export interface FlightInsuranceQuoteResponse {
  airlineIataCode: string;
  flightNumber: string;
  quoteSource: string;
  daysUntilDeparture: number;
  basePremiumEth: number;
  daysMultiplier: number;
  performanceMultiplier: number;
  totalMultiplier: number;
  quotedPremiumEth: number;
  ontimePercent: number;
  delayMeanMinutes: number;
  allStars: number;
  severeDelayRate: number;
  disruptionRate: number;
}
