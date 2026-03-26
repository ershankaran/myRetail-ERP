import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormField, MatLabel, MatError, MatSuffix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatCardContent,
    MatFormField,
    MatLabel,
    MatError,
    MatSuffix,
    MatInput,
    MatButton,
    MatIconButton,
    MatIcon,
    MatProgressSpinner,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <div class="login-header">
          <mat-icon class="login-logo">storefront</mat-icon>
          <h1 class="login-title">myRetail ERP</h1>
          <p class="login-subtitle">Sign in to your account</p>
        </div>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input
                matInput
                type="email"
                formControlName="email"
                placeholder="admin@retailerp.com"
              />
              <mat-icon matSuffix>email</mat-icon>
              @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (form.get('email')?.hasError('email')) {
                <mat-error>Enter a valid email</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput [type]="hide ? 'password' : 'text'" formControlName="password" />
              <button mat-icon-button matSuffix type="button" (click)="hide = !hide">
                <mat-icon>{{ hide ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
            </mat-form-field>

            @if (error) {
              <div class="error-box"><mat-icon>error_outline</mat-icon> {{ error }}</div>
            }

            <button
              mat-raised-button
              color="primary"
              type="submit"
              class="login-btn"
              [disabled]="form.invalid || loading"
            >
              @if (loading) {
                <mat-spinner diameter="20" />
              } @else {
                Sign In
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .login-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #1e2a3a 0%, #3f51b5 100%);
      }
      .login-card {
        width: 420px;
        padding: 32px;
        border-radius: 16px !important;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
      }
      .login-header {
        text-align: center;
        margin-bottom: 32px;
      }
      .login-logo {
        font-size: 56px;
        width: 56px;
        height: 56px;
        color: #3f51b5;
      }
      .login-title {
        font-size: 24px;
        font-weight: 700;
        color: #1e2a3a;
        margin: 8px 0;
      }
      .login-subtitle {
        color: #666;
        font-size: 14px;
        margin: 0;
      }
      .full-width {
        width: 100%;
        margin-bottom: 16px;
      }
      .error-box {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #c62828;
        background: #ffebee;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 14px;
        margin-bottom: 16px;
      }
      .login-btn {
        width: 100%;
        height: 48px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 8px !important;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';
  hide = true;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.value;

    this.auth.login(email, password).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.status === 'SUCCESS') {
          this.router.navigate(['/dashboard']);
        } else {
          // Spring Boot returned 200 but with ERROR status
          this.error = res.message || 'Invalid email or password';
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Unable to connect to server';
      },
    });
  }
}
