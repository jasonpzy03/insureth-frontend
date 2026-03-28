import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {API} from '../../../core/constants/api.constants';
import {ClientUserModel} from '../models/clientUserModel';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Base URL for your API Gateway
  private readonly apiBaseUrl =
    API.GATEWAY + '/' +
    API.BASE_URL + '/' +
    API.AUTH + '/' +
    API.CP_USERS;

  constructor(private http: HttpClient) {}

  checkClientUserExists(walletAddress: string): Observable<boolean> {
    const url = `${this.apiBaseUrl}/exists`;
    return this.http.get<boolean>(url, {
      params: { walletAddress }
    });
  }

  createClientUser(userModel: ClientUserModel): Observable<void> {
  const url = `${this.apiBaseUrl}/create`;
  return this.http.post<void>(url, userModel);
  }
}
