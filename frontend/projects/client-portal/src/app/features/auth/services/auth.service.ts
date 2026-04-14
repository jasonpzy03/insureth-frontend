import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import {API} from '../../../core/constants/api.constants';
import {ClientUserModel} from '../models/clientUserModel';
import { ClientPortalAuthResponse, ClientPortalNonceResponse } from '../models/clientPortalAuth.models';

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
  private readonly clientAuthBaseUrl =
    API.GATEWAY + '/' +
    API.BASE_URL + '/' +
    API.AUTH + '/' +
    API.CLIENT;

  constructor(private http: HttpClient) {}

  checkClientUserExists(walletAddress: string): Observable<boolean> {
    const url = `${this.apiBaseUrl}/exists`;
    return this.http.get<boolean>(url, {
      params: { walletAddress }
    });
  }

  createClientUser(userModel: ClientUserModel, context?: HttpContext): Observable<void> {
    const url = `${this.apiBaseUrl}/create`;
    return this.http.post<void>(url, userModel, context ? { context } : undefined);
  }

  getClientUser(walletAddress: string): Observable<ClientUserModel> {
    const url = `${this.apiBaseUrl}/${walletAddress}`;
    return this.http.get<ClientUserModel>(url);
  }

  updateClientUser(walletAddress: string, userModel: ClientUserModel, context?: HttpContext): Observable<void> {
    const url = `${this.apiBaseUrl}/${walletAddress}`;
    return this.http.put<void>(url, userModel, context ? { context } : undefined);
  }

  issueClientNonce(walletAddress: string): Observable<ClientPortalNonceResponse> {
    return this.http.post<ClientPortalNonceResponse>(`${this.clientAuthBaseUrl}/nonce`, { walletAddress });
  }

  loginClientWallet(walletAddress: string, signature: string, nonce: string, message: string): Observable<ClientPortalAuthResponse> {
    return this.http.post<ClientPortalAuthResponse>(`${this.clientAuthBaseUrl}/login`, {
      walletAddress,
      signature,
      nonce,
      message
    });
  }

  getCurrentClientUser(): Observable<ClientUserModel> {
    return this.http.get<ClientUserModel>(`${this.clientAuthBaseUrl}/me`);
  }
}
