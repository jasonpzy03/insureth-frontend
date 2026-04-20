import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API } from '../constants/api.constants';

export type BackofficePolicyRecord = {
  policyId: number;
  holder: string;
  riskKey: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: number;
  purchaseTimestamp: number | null;
  premiumWei: string;
  payoutAmountWei: string;
  active: boolean;
  claimed: boolean;
  resolved: boolean;
  exists: boolean;
  oracleRequested: boolean;
  statusInt: number;
  statusLabel: string;
  delayMinutes: number;
  policiesSharingRisk: number;
};

export type BackofficePolicySyncResponse = {
  syncedPolicies: number;
  syncedAt: string;
};

@Injectable({
  providedIn: 'root'
})
export class BackofficePolicyOperationsService {
  private readonly http = inject(HttpClient);

  listPolicies(): Promise<BackofficePolicyRecord[]> {
    return firstValueFrom(
      this.http.get<BackofficePolicyRecord[]>(`${API.INSURANCE_BASE_URL}/admin/flightinsurance/policies`)
    );
  }

  syncPolicies(policies: BackofficePolicyRecord[]): Promise<BackofficePolicySyncResponse> {
    return firstValueFrom(
      this.http.post<BackofficePolicySyncResponse>(
        `${API.INSURANCE_BASE_URL}/admin/flightinsurance/policies/sync`,
        { policies }
      )
    );
  }
}
