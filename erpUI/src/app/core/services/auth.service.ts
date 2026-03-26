import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { User, Role } from '../models/user.model';

interface AuthData {
  token: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<User | null>(null);

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly role = computed(() => this._user()?.role ?? null);
  readonly token = computed(() => this._user()?.token ?? null);

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    const stored = sessionStorage.getItem('erp_user');
    if (stored) this._user.set(JSON.parse(stored));
  }

  login(email: string, password: string): Observable<ApiResponse<AuthData>> {
    return this.http
      .post<ApiResponse<AuthData>>(`${environment.apiUrls.iam}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          if (res.status === 'SUCCESS') {
            const payload = JSON.parse(atob(res.data.token.split('.')[1]));
            const rawRole = payload.role as string;
            const user: User = {
              email,
              role: rawRole.replace('ROLE_', '') as Role,
              token: res.data.token,
            };
            this._user.set(user);
            sessionStorage.setItem('erp_user', JSON.stringify(user));
          }
          // Don't throw — let the component handle ERROR status
        }),
      );
  }

  logout(): void {
    this._user.set(null);
    sessionStorage.removeItem('erp_user');
    this.router.navigate(['/login']);
  }

  hasRole(...roles: Role[]): boolean {
    const current = this.role();
    return current ? roles.includes(current) : false;
  }
}
