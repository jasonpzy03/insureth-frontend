import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API } from '../constants/api.constants';
import { BackofficeRole, BackofficeUser, BackofficeUserCreateRequest } from '../models/backoffice-auth.models';

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

  listRoles(): Promise<BackofficeRole[]> {
    return firstValueFrom(
      this.http.get<BackofficeRole[]>(`${API.AUTH_BASE_URL}/${API.BACKOFFICE}/users/roles`)
    );
  }

  createUser(payload: BackofficeUserCreateRequest): Promise<BackofficeUser> {
    return firstValueFrom(
      this.http.post<BackofficeUser>(`${API.AUTH_BASE_URL}/${API.BACKOFFICE}/users`, payload)
    );
  }
}
