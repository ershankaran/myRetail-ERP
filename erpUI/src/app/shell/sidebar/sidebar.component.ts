import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIcon, MatDivider],
  template: `
    <div class="sidebar-wrapper">
      <div class="sidebar-logo">
        <mat-icon class="logo-icon">storefront</mat-icon>
        <span class="logo-text">myRetail ERP</span>
      </div>
      <div class="user-role">{{ displayRole }}</div>
      <div class="sidebar-user">
        <div class="user-avatar">
          {{ auth.user()?.email?.charAt(0)?.toUpperCase() }}
        </div>
        <div class="user-info">
          <div class="user-email">{{ auth.user()?.email }}</div>
          <div class="user-role">{{ displayRole }}</div>
        </div>
      </div>

      <mat-divider class="sidebar-divider" />

      <nav class="sidebar-nav">
        @for (item of visibleItems(); track item.route) {
          <a [routerLink]="item.route" routerLinkActive="active" class="nav-item">
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>
        }
      </nav>

      <div class="sidebar-footer">
        <mat-divider class="sidebar-divider" />
        <button class="nav-item logout-btn" (click)="auth.logout()">
          <mat-icon>logout</mat-icon>
          <span>Logout</span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .sidebar-wrapper {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #1e2a3a;
        color: #fff;
      }
      .sidebar-logo {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 20px 16px;
      }
      .logo-icon {
        color: #64b5f6;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .logo-text {
        font-size: 16px;
        font-weight: 700;
      }
      .sidebar-user {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 16px;
        margin: 0 8px 8px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
      }
      .user-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #3f51b5;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 16px;
        flex-shrink: 0;
      }
      .user-email {
        font-size: 12px;
        color: #ccc;
      }
      .user-role {
        font-size: 11px;
        color: #64b5f6;
        font-weight: 600;
      }
      .sidebar-divider {
        border-color: rgba(255, 255, 255, 0.1) !important;
        margin: 4px 0;
      }
      .sidebar-nav {
        flex: 1;
        padding: 8px;
        overflow-y: auto;
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        margin-bottom: 2px;
        color: rgba(255, 255, 255, 0.7);
        text-decoration: none;
        cursor: pointer;
        border: none;
        background: none;
        width: 100%;
        font-size: 14px;
        font-weight: 500;
        transition:
          background 0.2s,
          color 0.2s;
      }
      .nav-item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #fff;
      }
      .nav-item.active {
        background: rgba(100, 181, 246, 0.15);
        color: #64b5f6;
      }
      .sidebar-footer {
        padding: 8px;
      }
      .logout-btn:hover {
        color: #ef5350 !important;
      }
    `,
  ],
})
export class SidebarComponent {
  navItems = [
    {
      label: 'Dashboard',
      icon: 'dashboard',
      route: '/dashboard',
      roles: ['ADMIN', 'STORE_MANAGER', 'CASHIER', 'FINANCE', 'HR'],
    },
    {
      label: 'Inventory',
      icon: 'inventory_2',
      route: '/inventory',
      roles: ['ADMIN', 'STORE_MANAGER', 'CASHIER', 'FINANCE'],
    },
    {
      label: 'Orders',
      icon: 'shopping_cart',
      route: '/orders',
      roles: ['ADMIN', 'STORE_MANAGER', 'CASHIER'],
    },
    {
      label: 'Point of Sale',
      icon: 'point_of_sale',
      route: '/pos',
      roles: ['ADMIN', 'STORE_MANAGER', 'CASHIER'],
    },
    { label: 'Finance', icon: 'account_balance', route: '/finance', roles: ['ADMIN', 'FINANCE'] },
    { label: 'User Management', icon: 'manage_accounts', route: '/iam', roles: ['ADMIN'] },
  ];

  visibleItems = computed(() => {
    const role = this.auth.role()?.replace('ROLE_', '');
    return this.navItems.filter((i) => (role ? i.roles.includes(role) : false));
  });

  get displayRole(): string {
    return this.auth.role()?.replace('ROLE_', '') ?? '';
  }
  constructor(public auth: AuthService) {}
}
