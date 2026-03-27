import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { IamService, UserRecord, RegisterRequest } from '../../../core/services/iam.service';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    MatSidenavModule,
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <h2>User Management</h2>
        <button mat-raised-button color="primary" (click)="openForm()">
          <mat-icon>person_add</mat-icon> Add User
        </button>
      </div>

      <!-- Summary -->
      <div class="summary-row">
        @for (role of roles; track role.key) {
          <mat-card class="role-card">
            <mat-card-content>
              <div class="role-count">{{ countByRole(role.key) }}</div>
              <div class="role-name">{{ role.label }}</div>
              <div class="role-dot" [style.background]="role.color"></div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      <!-- Users Table -->
      @if (loading) {
        <div class="center"><mat-spinner diameter="48"></mat-spinner></div>
      }

      @if (!loading) {
        <mat-card class="table-card">
          <mat-card-content>
            <table mat-table [dataSource]="users">
              <ng-container matColumnDef="avatar">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let u">
                  <div class="avatar" [style.background]="roleColor(u.role)">
                    {{ u.email?.charAt(0)?.toUpperCase() }}
                  </div>
                </td>
              </ng-container>

              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let u">
                  <div class="user-email">{{ u.email }}</div>
                  <div class="user-fullname">{{ u.fullName }}</div>
                </td>
              </ng-container>

              <ng-container matColumnDef="fullName">
                <th mat-header-cell *matHeaderCellDef>Full Name</th>
                <td mat-cell *matCellDef="let u">{{ u.fullName }}</td>
              </ng-container>

              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let u">
                  <span
                    class="role-badge"
                    [style.background]="roleColor(u.role) + '20'"
                    [style.color]="roleColor(u.role)"
                  >
                    {{ u.role }}
                  </span>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let r; columns: cols"></tr>
            </table>

            @if (users.length === 0) {
              <div class="empty">
                <mat-icon>people</mat-icon>
                <p>No users found</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Add User Side Panel -->
      @if (showForm) {
        <div class="overlay" (click)="closeForm()"></div>
        <div class="side-panel">
          <div class="panel-header">
            <h3>Add New User</h3>
            <button mat-icon-button (click)="closeForm()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <mat-divider></mat-divider>

          <form [formGroup]="form" (ngSubmit)="register()" class="panel-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Full Name</mat-label>
              <input matInput formControlName="fullName" placeholder="e.g. Shankaran V" />
              <mat-icon matSuffix>person</mat-icon>
              @if (form.get('fullName')?.hasError('required') && form.get('fullName')?.touched) {
                <mat-error>Full name is required</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input
                matInput
                type="email"
                formControlName="email"
                placeholder="user@retailerp.com"
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
              <input
                matInput
                [type]="hidePassword ? 'password' : 'text'"
                formControlName="password"
              />
              <button
                mat-icon-button
                matSuffix
                type="button"
                (click)="hidePassword = !hidePassword"
              >
                <mat-icon>
                  {{ hidePassword ? 'visibility_off' : 'visibility' }}
                </mat-icon>
              </button>
              @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (form.get('password')?.hasError('minlength')) {
                <mat-error>Minimum 6 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Role</mat-label>
              <mat-select formControlName="role">
                @for (role of roles; track role.key) {
                  <mat-option [value]="role.key">
                    {{ role.label }}
                  </mat-option>
                }
              </mat-select>
              @if (form.get('role')?.hasError('required') && form.get('role')?.touched) {
                <mat-error>Role is required</mat-error>
              }
            </mat-form-field>

            @if (formError) {
              <div class="form-error">
                <mat-icon>error_outline</mat-icon>
                {{ formError }}
              </div>
            }

            <div class="form-actions">
              <button mat-stroked-button type="button" (click)="closeForm()">Cancel</button>
              <button
                mat-raised-button
                color="primary"
                type="submit"
                [disabled]="form.invalid || registering"
              >
                @if (registering) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <mat-icon>person_add</mat-icon> Register
                }
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 24px;
        h2 {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }
      }

      /* Role summary cards */
      .summary-row {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 12px;
        margin-bottom: 24px;
      }
      .role-card {
        border-radius: 10px !important;
        cursor: default;
      }
      .role-card mat-card-content {
        padding: 16px !important;
        position: relative;
        text-align: center;
      }
      .role-count {
        font-size: 28px;
        font-weight: 700;
        color: #1e2a3a;
      }
      .role-name {
        font-size: 12px;
        color: #888;
        margin-top: 4px;
      }
      .role-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        position: absolute;
        top: 12px;
        right: 12px;
      }

      /* Table */
      .center {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 300px;
      }
      .table-card {
        border-radius: 12px !important;
      }
      .table-card mat-card-content {
        padding: 0 !important;
      }
      table {
        width: 100%;
      }

      .avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 15px;
        color: #fff;
      }
      .user-email {
        font-size: 14px;
        font-weight: 500;
      }
      .user-fullname {
        font-size: 12px;
        color: #888;
      }
      .role-badge {
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 48px;
        color: #bbb;
        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
        }
      }

      /* Side panel */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.3);
        z-index: 100;
      }
      .side-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 420px;
        height: 100vh;
        background: #fff;
        z-index: 101;
        box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }
      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
      }
      .panel-form {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .full-width {
        width: 100%;
      }
      .form-error {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #c62828;
        background: #ffebee;
        padding: 10px 14px;
        border-radius: 8px;
        font-size: 14px;
        margin-bottom: 8px;
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
      .form-actions {
        display: flex;
        gap: 12px;
        margin-top: 8px;
        button {
          flex: 1;
          height: 44px;
        }
      }
    `,
  ],
})
export class UserListComponent implements OnInit {
  private iamService = inject(IamService);
  public auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);

  users: UserRecord[] = [];
  loading = true;
  showForm = false;
  registering = false;
  hidePassword = true;
  formError = '';
  form!: FormGroup;
  cols = ['avatar', 'email', 'role'];

  roles = [
    { key: 'ADMIN', label: 'Admin', color: '#c62828' },
    { key: 'STORE_MANAGER', label: 'Store Manager', color: '#e65100' },
    { key: 'CASHIER', label: 'Cashier', color: '#1565c0' },
    { key: 'FINANCE', label: 'Finance', color: '#2e7d32' },
    { key: 'HR', label: 'HR', color: '#6a1b9a' },
  ];

  ngOnInit(): void {
    this.form = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required],
    });
    this.loadUsers();
  }

  countByRole(role: string): number {
    return this.users.filter((u) => u.role === role).length;
  }

  roleColor(role: string): string {
    return this.roles.find((r) => r.key === role)?.color ?? '#666';
  }

  openForm(): void {
    this.showForm = true;
    this.form.reset();
    this.formError = '';
  }
  closeForm(): void {
    this.showForm = false;
  }

  register(): void {
    if (this.form.invalid) return;
    this.registering = true;
    this.formError = '';

    const req: RegisterRequest = {
      fullName: this.form.value.fullName,
      email: this.form.value.email,
      password: this.form.value.password,
      role: this.form.value.role as Role,
    };

    this.iamService.register(req).subscribe({
      next: (res) => {
        this.registering = false;
        this.users = [...this.users, res.data];
        this.closeForm();
        this.snackBar.open(`User ${res.data.email} registered successfully`, 'Close', {
          duration: 3000,
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.registering = false;
        this.formError = err.error?.message || 'Registration failed';
        this.cdr.detectChanges();
      },
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.iamService.getUsers().subscribe({
      next: (res) => {
        this.users = res.data ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
