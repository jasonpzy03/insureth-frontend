import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API } from '../../../../core/constants/api.constants';
import { AirlineModel } from '../models/airlineModel';
import { AirportModel } from '../models/airportModel';
import { FlightInsuranceExperienceConfigResponse } from '../models/flightInsuranceConfig.model';
import { FlightInsuranceQuoteResponse } from '../models/flightInsuranceQuote.model';
import { FlightScheduleResponseModel } from '../models/flightScheduleModel';

@Injectable({
  providedIn: 'root'
})
export class FlightInsuranceService {
  // Base URL for your API Gateway
  private readonly apiBaseUrl =
    API.GATEWAY + '/' +
    API.BASE_URL + '/' +
    API.INSURANCE + '/' +
    API.FLIGHT_INSURANCE;

  constructor(private http: HttpClient) {}

  getAirlines(): Observable<AirlineModel[]> {
    return this.http.get<AirlineModel[]>(`${this.apiBaseUrl}/airlines`);
  }

  getAirports(): Observable<AirportModel[]> {
    return this.http.get<AirportModel[]>(`${this.apiBaseUrl}/airports`);
  }

  getConfig(): Observable<FlightInsuranceExperienceConfigResponse> {
    return this.http.get<FlightInsuranceExperienceConfigResponse>(`${this.apiBaseUrl}/config`);
  }

  getFlightSchedule(
    airlineIATACode: string,
    flightNumber: string,
    departureAirportIATACode: string,
    departureDate: string
  ): Observable<FlightScheduleResponseModel> {
    const params = new HttpParams()
      .set('airlineIATACode', airlineIATACode)
      .set('flightNumber', flightNumber)
      .set('departureAirportIATACode', departureAirportIATACode)
      .set('departureDate', departureDate);

    return this.http.get<FlightScheduleResponseModel>(`${this.apiBaseUrl}/flightfutureschedule`, { params });
  }

  getQuote(
    airlineIATACode: string,
    flightNumber: string,
    departureDate: string
  ): Observable<FlightInsuranceQuoteResponse> {
    const params = new HttpParams()
      .set('airlineIATACode', airlineIATACode)
      .set('flightNumber', flightNumber)
      .set('departureDate', departureDate);

    return this.http.get<FlightInsuranceQuoteResponse>(`${this.apiBaseUrl}/quote`, { params });
  }

}
