import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Role } from '../models/user.model';

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

export interface UserRecord {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class IamService {
  private base = `${environment.apiUrls.iam}/auth`;

  constructor(private http: HttpClient) {}

  register(req: RegisterRequest): Observable<ApiResponse<UserRecord>> {
    return this.http.post<ApiResponse<UserRecord>>(`${this.base}/register`, req);
  }

  getUsers(): Observable<ApiResponse<UserRecord[]>> {
    return this.http.get<ApiResponse<UserRecord[]>>(`${this.base}/users`);
  }
}
