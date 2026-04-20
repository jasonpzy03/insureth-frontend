export interface FlightScheduleResponseModel {
    flightIATA: string;
    departureAirportIATA: string;
    arrivalAirportIATA: string;
    departureAirportName: string;
    arrivalAirportName: string;
    departureTime: string;
    arrivalTime: string;
    departureLocalTime: string;
    arrivalLocalTime: string;
    departureTimezone: string;
    arrivalTimezone: string;
}
