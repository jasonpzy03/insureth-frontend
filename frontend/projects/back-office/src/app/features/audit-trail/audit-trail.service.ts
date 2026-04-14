import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API } from '../../core/constants/api.constants';
import { AdminPagedResponse, AuditTrailItem } from './audit-trail.models';

@Injectable({
  providedIn: 'root'
})
export class AuditTrailService {
  private readonly http = inject(HttpClient);

  listAuthAuditTrail(page: number, size: number, search: string): Promise<AdminPagedResponse<AuditTrailItem>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return firstValueFrom(
      this.http.get<AdminPagedResponse<AuditTrailItem>>(`${API.AUTH_BASE_URL}/backoffice/audit-trail`, { params })
    );
  }

  listInsuranceAuditTrail(page: number, size: number, search: string): Promise<AdminPagedResponse<AuditTrailItem>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search.trim()) {
      params = params.set('search', search.trim());
    }

    return firstValueFrom(
      this.http.get<AdminPagedResponse<AuditTrailItem>>(`${API.INSURANCE_BASE_URL}/admin/flightinsurance/audit-trail`, { params })
    );
  }
}
