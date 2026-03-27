import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, DecimalPipe, SlicePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order, OrderStatus } from '../../../shared/models/order.model';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    SlicePipe,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <h2>Orders</h2>
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Filter by Status</mat-label>
          <mat-select [(ngModel)]="selectedStatus" (ngModelChange)="onStatusChange($event)">
            <mat-option value="ALL">All Orders</mat-option>
            <mat-option value="PENDING">Pending</mat-option>
            <mat-option value="CONFIRMED">Confirmed</mat-option>
            <mat-option value="PROCESSING">Processing</mat-option>
            <mat-option value="SHIPPED">Shipped</mat-option>
            <mat-option value="DELIVERED">Delivered</mat-option>
            <mat-option value="CANCELLED">Cancelled</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Summary Cards -->
      <div class="summary-row">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-value">{{ totalOrders }}</div>
            <div class="stat-label">Total Orders</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card pending">
          <mat-card-content>
            <div class="stat-value">{{ countByStatus('PENDING') }}</div>
            <div class="stat-label">Pending</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card confirmed">
          <mat-card-content>
            <div class="stat-value">{{ countByStatus('CONFIRMED') }}</div>
            <div class="stat-label">Confirmed</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat-card delivered">
          <mat-card-content>
            <div class="stat-value">{{ countByStatus('DELIVERED') }}</div>
            <div class="stat-label">Delivered</div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Table -->
      @if (loading) {
        <div class="center"><mat-spinner diameter="48"></mat-spinner></div>
      }

      @if (!loading) {
        <mat-card>
          <mat-card-content>
            <table mat-table [dataSource]="filteredOrders">
              <ng-container matColumnDef="orderId">
                <th mat-header-cell *matHeaderCellDef>Order ID</th>
                <td mat-cell *matCellDef="let o">
                  <span class="order-id">{{ o.id | slice: 0 : 8 }}...</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="customer">
                <th mat-header-cell *matHeaderCellDef>Customer</th>
                <td mat-cell *matCellDef="let o">{{ o.customerId }}</td>
              </ng-container>

              <ng-container matColumnDef="items">
                <th mat-header-cell *matHeaderCellDef>Items</th>
                <td mat-cell *matCellDef="let o">{{ o.items.length }}</td>
              </ng-container>

              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef>Total</th>
                <td mat-cell *matCellDef="let o">
                  <strong>₹{{ o.totalAmount | number: '1.2-2' }}</strong>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let o">
                  <span [class]="'badge ' + statusClass(o.status)">
                    {{ o.status }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let o">
                  {{ o.createdAt | date: 'dd MMM, HH:mm' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let o">
                  <button mat-icon-button color="primary" [routerLink]="['/orders', o.id]">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  @if (canShip(o) && auth.hasRole('ADMIN', 'STORE_MANAGER')) {
                    <button
                      mat-icon-button
                      color="accent"
                      (click)="ship(o); $event.stopPropagation()"
                    >
                      <mat-icon>local_shipping</mat-icon>
                    </button>
                  }
                  @if (canCancel(o) && auth.hasRole('ADMIN', 'STORE_MANAGER')) {
                    <button
                      mat-icon-button
                      color="warn"
                      (click)="cancelPrompt(o); $event.stopPropagation()"
                    >
                      <mat-icon>cancel</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr
                mat-row
                *matRowDef="let r; columns: cols"
                [routerLink]="['/orders', r.id]"
                class="clickable-row"
              ></tr>
            </table>

            @if (filteredOrders.length === 0) {
              <div class="empty">
                <mat-icon>shopping_cart</mat-icon>
                <p>No orders found</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
        h2 {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }
      }
      .filter-field {
        width: 200px;
      }

      .summary-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }
      .stat-card mat-card-content {
        padding: 16px !important;
        text-align: center;
      }
      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: #1e2a3a;
      }
      .stat-label {
        font-size: 13px;
        color: #888;
        margin-top: 4px;
      }
      .stat-card.pending .stat-value {
        color: #6a1b9a;
      }
      .stat-card.confirmed .stat-value {
        color: #1565c0;
      }
      .stat-card.delivered .stat-value {
        color: #2e7d32;
      }

      .center {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 300px;
      }
      .order-id {
        font-family: monospace;
        font-size: 13px;
        color: #1565c0;
      }
      .clickable-row {
        cursor: pointer;
      }
      .clickable-row:hover {
        background: #f5f5f5;
      }
      table {
        width: 100%;
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
      mat-card {
        border-radius: 12px !important;
      }
      mat-card-content {
        padding: 20px !important;
      }
    `,
  ],
})
export class OrderListComponent implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  loading = true;
  selectedStatus = 'ALL';
  cols = ['orderId', 'customer', 'items', 'total', 'status', 'date', 'actions'];

  constructor(
    private orderService: OrderService,
    public auth: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.loading = true;
    const obs = this.auth.hasRole('ADMIN', 'STORE_MANAGER')
      ? this.orderService.getOrdersByStatus('PENDING')
      : this.orderService.getMyOrders();

    // Load all statuses for ADMIN/STORE_MANAGER
    if (this.auth.hasRole('ADMIN', 'STORE_MANAGER')) {
      const statuses: OrderStatus[] = [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
      ];
      let loaded = 0;
      this.orders = [];

      statuses.forEach((status) => {
        this.orderService.getOrdersByStatus(status).subscribe({
          next: (res) => {
            this.orders = [...this.orders, ...(res.data || [])];
            loaded++;
            if (loaded === statuses.length) {
              this.orders.sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              );
              this.applyFilter();
              this.loading = false;
              this.cdr.detectChanges();
            }
          },
          error: () => {
            loaded++;
            if (loaded === statuses.length) {
              this.applyFilter();
              this.loading = false;
              this.cdr.detectChanges();
            }
          },
        });
      });
    } else {
      this.orderService.getMyOrders().subscribe({
        next: (res) => {
          this.orders = res.data || [];
          this.applyFilter();
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

  onStatusChange(status: string): void {
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredOrders =
      this.selectedStatus === 'ALL'
        ? [...this.orders]
        : this.orders.filter((o) => o.status === this.selectedStatus);
  }

  get totalOrders(): number {
    return this.orders.length;
  }

  countByStatus(status: string): number {
    return this.orders.filter((o) => o.status === status).length;
  }

  canShip(o: Order): boolean {
    return o.status === 'CONFIRMED';
  }
  canCancel(o: Order): boolean {
    return o.status === 'PENDING' || o.status === 'CONFIRMED';
  }

  ship(o: Order): void {
    this.orderService.shipOrder(o.id).subscribe({
      next: () => {
        o.status = 'SHIPPED';
        this.cdr.detectChanges();
        this.snackBar.open('Order shipped successfully', 'Close', { duration: 3000 });
      },
      error: (err) =>
        this.snackBar.open(err.error?.message || 'Failed to ship order', 'Close', {
          duration: 4000,
        }),
    });
  }

  cancelPrompt(o: Order): void {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;
    this.orderService.cancelOrder(o.id, reason).subscribe({
      next: () => {
        o.status = 'CANCELLED';
        this.applyFilter();
        this.cdr.detectChanges();
        this.snackBar.open('Order cancelled', 'Close', { duration: 3000 });
      },
      error: (err) =>
        this.snackBar.open(err.error?.message || 'Failed to cancel order', 'Close', {
          duration: 4000,
        }),
    });
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'purple',
      CONFIRMED: 'info',
      PROCESSING: 'warning',
      SHIPPED: 'warning',
      DELIVERED: 'success',
      CANCELLED: 'error',
    };
    return map[status] ?? 'neutral';
  }
}
