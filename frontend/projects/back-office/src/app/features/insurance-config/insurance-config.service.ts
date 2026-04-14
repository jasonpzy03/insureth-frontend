import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API } from '../../core/constants/api.constants';
import {
  AdminPagedResponse,
  FlightInsuranceAdminAirlineModel,
  FlightInsuranceAdminAirportModel,
  FlightInsuranceAirlineUpdateRequest,
  FlightInsuranceAirportUpdateRequest,
  FlightInsurancePricingConfigRequest,
  FlightInsurancePricingConfigResponse
} from './insurance-config.models';

@Injectable({
  providedIn: 'root'
})
export class InsuranceConfigService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API.INSURANCE_BASE_URL}/admin/flightinsurance`;

  getPricingConfig(): Promise<FlightInsurancePricingConfigResponse> {
    return firstValueFrom(this.http.get<FlightInsurancePricingConfigResponse>(`${this.baseUrl}/config`));
  }

  updatePricingConfig(payload: FlightInsurancePricingConfigRequest): Promise<FlightInsurancePricingConfigResponse> {
    return firstValueFrom(this.http.put<FlightInsurancePricingConfigResponse>(`${this.baseUrl}/config`, payload));
  }

  listAirlines(page: number, size: number, search: string): Promise<AdminPagedResponse<FlightInsuranceAdminAirlineModel>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return firstValueFrom(
      this.http.get<AdminPagedResponse<FlightInsuranceAdminAirlineModel>>(`${this.baseUrl}/airlines`, { params })
    );
  }

  getAirline(airlineId: number): Promise<FlightInsuranceAdminAirlineModel> {
    return firstValueFrom(this.http.get<FlightInsuranceAdminAirlineModel>(`${this.baseUrl}/airlines/${airlineId}`));
  }

  updateAirline(airlineId: number, payload: FlightInsuranceAirlineUpdateRequest): Promise<FlightInsuranceAdminAirlineModel> {
    return firstValueFrom(this.http.put<FlightInsuranceAdminAirlineModel>(`${this.baseUrl}/airlines/${airlineId}`, payload));
  }

  listAirports(page: number, size: number, search: string): Promise<AdminPagedResponse<FlightInsuranceAdminAirportModel>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return firstValueFrom(
      this.http.get<AdminPagedResponse<FlightInsuranceAdminAirportModel>>(`${this.baseUrl}/airports`, { params })
    );
  }

  getAirport(airportId: number): Promise<FlightInsuranceAdminAirportModel> {
    return firstValueFrom(this.http.get<FlightInsuranceAdminAirportModel>(`${this.baseUrl}/airports/${airportId}`));
  }

  updateAirport(airportId: number, payload: FlightInsuranceAirportUpdateRequest): Promise<FlightInsuranceAdminAirportModel> {
    return firstValueFrom(this.http.put<FlightInsuranceAdminAirportModel>(`${this.baseUrl}/airports/${airportId}`, payload));
  }
}
