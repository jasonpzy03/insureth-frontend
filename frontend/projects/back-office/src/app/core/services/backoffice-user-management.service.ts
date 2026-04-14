import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API } from '../constants/api.constants';
import { BackofficeUser, BackofficeUserCreateRequest } from '../models/backoffice-auth.models';

@Injectable({
  providedIn: 'root'
})
export class BackofficeUserManagementService {
  private readonly http = inject(HttpClient);

  listUsers(): Promise<BackofficeUser[]> {
    return firstValueFrom(
      this.http.get<BackofficeUser[]>(`${API.AUTH_BASE_URL}/${API.BACKOFFICE}/users`)
    );
  }

  createUser(payload: BackofficeUserCreateRequest): Promise<BackofficeUser> {
    return firstValueFrom(
      this.http.post<BackofficeUser>(`${API.AUTH_BASE_URL}/${API.BACKOFFICE}/users`, payload)
    );
  }
}
