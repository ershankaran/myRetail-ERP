import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { DecimalPipe } from '@angular/common';
import { FinanceService } from '../../core/services/finance.service';
import { InventoryService } from '../../core/services/inventory.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';

interface QuickLink {
  label: string;
  icon: string;
  route: string;
  color: string;
  roles: string[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatButtonModule, MatDividerModule, DecimalPipe],
  template: `
    <div class="page-container">
      <!-- Welcome Banner -->
      <div class="welcome-banner">
        <div>
          <h1 class="welcome-title">Welcome back, {{ firstName }} 👋</h1>
          <p class="welcome-sub">Here's what's happening at your store today.</p>
        </div>
        <div class="welcome-date">{{ today }}</div>
      </div>

      <!-- Summary Cards -->
      <div class="cards-grid">
        <mat-card class="summary-card revenue-card">
          <mat-card-content>
            <div class="card-icon-row">
              <mat-icon class="card-icon">payments</mat-icon>
              <span class="card-tag">Finance</span>
            </div>
            <div class="card-value">₹{{ dailySummary?.netRevenue | number: '1.2-2' }}</div>
            <div class="card-label">Today's Net Revenue</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card pos-card">
          <mat-card-content>
            <div class="card-icon-row">
              <mat-icon class="card-icon">point_of_sale</mat-icon>
              <span class="card-tag">POS</span>
            </div>
            <div class="card-value">{{ dailySummary?.posTransactions ?? 0 }}</div>
            <div class="card-label">POS Transactions</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card orders-card">
          <mat-card-content>
            <div class="card-icon-row">
              <mat-icon class="card-icon">shopping_cart</mat-icon>
              <span class="card-tag">Orders</span>
            </div>
            <div class="card-value">{{ dailySummary?.onlineTransactions ?? 0 }}</div>
            <div class="card-label">Online Orders</div>
          </mat-card-content>
        </mat-card>

        <mat-card class="summary-card stock-card">
          <mat-card-content>
            <div class="card-icon-row">
              <mat-icon class="card-icon">inventory_2</mat-icon>
              <span class="card-tag">Inventory</span>
            </div>
            <div class="card-value">{{ lowStockCount }}</div>
            <div class="card-label">Low Stock Alerts</div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Quick Navigation -->
      <h2 class="section-title">Quick Navigation</h2>
      <div class="links-grid">
        @for (link of visibleLinks(); track link.route) {
          <mat-card class="link-card" (click)="navigate(link.route)">
            <mat-card-content>
              <div class="link-icon-wrap" [style.background]="link.color + '20'">
                <mat-icon [style.color]="link.color">{{ link.icon }}</mat-icon>
              </div>
              <div class="link-label">{{ link.label }}</div>
              <div class="link-arrow">
                <mat-icon>arrow_forward</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .welcome-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: linear-gradient(135deg, #1e2a3a 0%, #3f51b5 100%);
        border-radius: 16px;
        padding: 28px 32px;
        margin-bottom: 28px;
        color: #fff;
      }
      .welcome-title {
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 6px;
      }
      .welcome-sub {
        font-size: 14px;
        opacity: 0.8;
        margin: 0;
      }
      .welcome-date {
        font-size: 14px;
        opacity: 0.7;
        white-space: nowrap;
      }

      .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      }

      .summary-card {
        border-radius: 12px !important;
        cursor: default;
      }
      .summary-card mat-card-content {
        padding: 20px !important;
      }
      .card-icon-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .card-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }
      .card-tag {
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 10px;
        background: #f0f0f0;
        color: #666;
      }
      .card-value {
        font-size: 30px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .card-label {
        font-size: 13px;
        color: #888;
      }

      .revenue-card .card-icon {
        color: #2e7d32;
      }
      .revenue-card .card-value {
        color: #2e7d32;
      }
      .pos-card .card-icon {
        color: #1565c0;
      }
      .pos-card .card-value {
        color: #1565c0;
      }
      .orders-card .card-icon {
        color: #e65100;
      }
      .orders-card .card-value {
        color: #e65100;
      }
      .stock-card .card-icon {
        color: #c62828;
      }
      .stock-card .card-value {
        color: #c62828;
      }

      .section-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0 0 16px;
        color: #333;
      }

      .links-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 16px;
      }

      .link-card {
        border-radius: 12px !important;
        cursor: pointer;
        transition:
          transform 0.15s,
          box-shadow 0.15s;
      }
      .link-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12) !important;
      }
      .link-card mat-card-content {
        padding: 20px !important;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      .link-icon-wrap {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .link-label {
        font-size: 14px;
        font-weight: 600;
        color: #333;
      }
      .link-arrow mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #aaa;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  dailySummary: any = null;
  lowStockCount = 0;
  today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  quickLinks: QuickLink[] = [
    {
      label: 'Inventory',
      icon: 'inventory_2',
      route: '/inventory',
      color: '#3f51b5',
      roles: ['ADMIN', 'STORE_MANAGER', 'CASHIER', 'FINANCE'],
    },
    {
      label: 'Orders',
      icon: 'shopping_cart',
      route: '/orders',
      color: '#e65100',
      roles: ['ADMIN', 'STORE_MANAGER', 'CASHIER'],
    },
    {
      label: 'Point of Sale',
      icon: 'point_of_sale',
      route: '/pos',
      color: '#1565c0',
      roles: ['ADMIN', 'STORE_MANAGER', 'CASHIER'],
    },
    {
      label: 'Finance',
      icon: 'account_balance',
      route: '/finance',
      color: '#2e7d32',
      roles: ['ADMIN', 'FINANCE'],
    },
    {
      label: 'User Management',
      icon: 'manage_accounts',
      route: '/iam',
      color: '#6a1b9a',
      roles: ['ADMIN'],
    },
  ];

  constructor(
    public auth: AuthService,
    private finance: FinanceService,
    private inventory: InventoryService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Load daily summary (only for ADMIN/FINANCE)
    if (this.auth.hasRole('ADMIN', 'FINANCE')) {
      this.finance.getDailySummary().subscribe({
        next: (res) => {
          this.dailySummary = res.data;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    }

    // Load low stock count
    if (this.auth.hasRole('ADMIN', 'STORE_MANAGER')) {
      this.inventory.getLowStock().subscribe({
        next: (res) => {
          this.lowStockCount = res.data?.length ?? 0;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
    }
  }

  visibleLinks(): QuickLink[] {
    const role = this.auth.role()?.replace('ROLE_', '');
    return this.quickLinks.filter((l) => (role ? l.roles.includes(role) : false));
  }

  navigate(route: string): void {
    this.router.navigate([route]);
  }
  get firstName(): string {
    return this.auth.user()?.email?.split('@')[0] ?? 'User';
  }
}
