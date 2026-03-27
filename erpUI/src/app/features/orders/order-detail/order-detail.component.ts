import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order } from '../../../shared/models/order.model';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatStepperModule,
  ],
  template: `
    <div class="page-container">
      <button mat-button (click)="goBack()" class="back-btn">
        <mat-icon>arrow_back</mat-icon> Back to Orders
      </button>

      @if (loading) {
        <div class="center"><mat-spinner diameter="48"></mat-spinner></div>
      }

      @if (!loading && order) {
        <div class="detail-grid">
          <!-- LEFT -->
          <div class="left-panel">
            <!-- Order Summary Card -->
            <mat-card>
              <mat-card-content>
                <div class="order-header">
                  <div>
                    <div class="order-id-label">ORDER ID</div>
                    <div class="order-id">{{ order.id }}</div>
                  </div>
                  <span [class]="'badge ' + statusClass(order.status)">
                    {{ order.status }}
                  </span>
                </div>

                <mat-divider class="my-divider" />

                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Customer</span>
                    <span class="info-value">{{ order.customerId }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Total Amount</span>
                    <span class="info-value price">
                      ₹{{ order.totalAmount | number: '1.2-2' }}
                    </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Created</span>
                    <span class="info-value">
                      {{ order.createdAt | date: 'dd MMM yyyy, HH:mm' }}
                    </span>
                  </div>
                  @if (order.confirmedAt) {
                    <div class="info-item">
                      <span class="info-label">Confirmed</span>
                      <span class="info-value">
                        {{ order.confirmedAt | date: 'dd MMM yyyy, HH:mm' }}
                      </span>
                    </div>
                  }
                  @if (order.shippedAt) {
                    <div class="info-item">
                      <span class="info-label">Shipped</span>
                      <span class="info-value">
                        {{ order.shippedAt | date: 'dd MMM yyyy, HH:mm' }}
                      </span>
                    </div>
                  }
                  @if (order.deliveredAt) {
                    <div class="info-item">
                      <span class="info-label">Delivered</span>
                      <span class="info-value">
                        {{ order.deliveredAt | date: 'dd MMM yyyy, HH:mm' }}
                      </span>
                    </div>
                  }
                  @if (order.cancellationReason) {
                    <div class="info-item full-width">
                      <span class="info-label">Cancellation Reason</span>
                      <span class="info-value error-text">
                        {{ order.cancellationReason }}
                      </span>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Order Timeline -->
            <mat-card>
              <mat-card-content>
                <h3 class="section-title">Order Timeline</h3>
                <div class="timeline">
                  @for (step of timeline; track step.status) {
                    <div
                      class="timeline-item"
                      [class.done]="step.done"
                      [class.cancelled]="step.cancelled"
                    >
                      <div class="timeline-dot">
                        <mat-icon>{{ step.icon }}</mat-icon>
                      </div>
                      <div class="timeline-content">
                        <div class="timeline-label">{{ step.label }}</div>
                        @if (step.time) {
                          <div class="timeline-time">{{ step.time | date: 'dd MMM, HH:mm' }}</div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- RIGHT -->
          <div class="right-panel">
            <!-- Order Items -->
            <mat-card>
              <mat-card-content>
                <h3 class="section-title">Items ({{ order.items.length }})</h3>
                <table mat-table [dataSource]="order.items">
                  <ng-container matColumnDef="product">
                    <th mat-header-cell *matHeaderCellDef>Product</th>
                    <td mat-cell *matCellDef="let i">
                      <div class="product-name">{{ i.productName }}</div>
                      <div class="product-sku">{{ i.sku }}</div>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="qty">
                    <th mat-header-cell *matHeaderCellDef>Qty</th>
                    <td mat-cell *matCellDef="let i">{{ i.quantity }}</td>
                  </ng-container>

                  <ng-container matColumnDef="price">
                    <th mat-header-cell *matHeaderCellDef>Unit Price</th>
                    <td mat-cell *matCellDef="let i">₹{{ i.unitPrice | number: '1.2-2' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="subtotal">
                    <th mat-header-cell *matHeaderCellDef>Subtotal</th>
                    <td mat-cell *matCellDef="let i">
                      <strong>₹{{ i.subtotal | number: '1.2-2' }}</strong>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="itemCols"></tr>
                  <tr mat-row *matRowDef="let r; columns: itemCols"></tr>
                </table>

                <mat-divider class="my-divider" />

                <div class="total-row">
                  <span class="total-label">Total</span>
                  <span class="total-value"> ₹{{ order.totalAmount | number: '1.2-2' }} </span>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Actions -->
            @if (auth.hasRole('ADMIN', 'STORE_MANAGER')) {
              <mat-card>
                <mat-card-content>
                  <h3 class="section-title">Actions</h3>
                  <div class="actions-row">
                    @if (order.status === 'CONFIRMED') {
                      <button
                        mat-raised-button
                        color="primary"
                        [disabled]="actionLoading"
                        (click)="ship()"
                      >
                        <mat-icon>local_shipping</mat-icon>
                        Ship Order
                      </button>
                    }

                    @if (order.status === 'SHIPPED') {
                      <button
                        mat-raised-button
                        color="primary"
                        [disabled]="actionLoading"
                        (click)="deliver()"
                      >
                        <mat-icon>done_all</mat-icon>
                        Mark Delivered
                      </button>
                    }

                    @if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
                      <button
                        mat-raised-button
                        color="warn"
                        [disabled]="actionLoading"
                        (click)="cancelPrompt()"
                      >
                        <mat-icon>cancel</mat-icon>
                        Cancel Order
                      </button>
                    }

                    @if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
                      <div class="no-actions">
                        <mat-icon>info</mat-icon>
                        No actions available for {{ order.status }} orders
                      </div>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .back-btn {
        margin-bottom: 16px;
        color: #666;
      }
      .center {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 300px;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        align-items: start;
      }
      @media (max-width: 900px) {
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
      .left-panel,
      .right-panel {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      /* Order header */
      .order-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      .order-id-label {
        font-size: 11px;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .order-id {
        font-family: monospace;
        font-size: 13px;
        color: #1565c0;
        margin-top: 4px;
      }

      /* Info grid */
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }
      .full-width {
        grid-column: 1 / -1;
      }
      .info-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .info-label {
        font-size: 11px;
        color: #999;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .info-value {
        font-size: 14px;
        font-weight: 500;
        color: #333;
      }
      .info-value.price {
        font-size: 18px;
        font-weight: 700;
        color: #1565c0;
      }
      .error-text {
        color: #c62828;
      }

      .my-divider {
        margin: 16px 0;
      }
      .section-title {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 16px;
      }

      /* Timeline */
      .timeline {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .timeline-item {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 8px 0;
        position: relative;
        color: #bbb;
      }
      .timeline-item.done {
        color: #2e7d32;
      }
      .timeline-item.cancelled {
        color: #c62828;
      }
      .timeline-item:not(:last-child)::after {
        content: '';
        position: absolute;
        left: 11px;
        top: 36px;
        width: 2px;
        height: calc(100% - 12px);
        background: #e0e0e0;
      }
      .timeline-item.done:not(:last-child)::after {
        background: #c8e6c9;
      }
      .timeline-dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 2px solid currentColor;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        background: #fff;
        mat-icon {
          font-size: 14px;
          width: 14px;
          height: 14px;
        }
      }
      .timeline-label {
        font-size: 14px;
        font-weight: 500;
      }
      .timeline-time {
        font-size: 12px;
        color: #888;
        margin-top: 2px;
      }

      /* Items table */
      table {
        width: 100%;
      }
      .product-name {
        font-size: 14px;
        font-weight: 500;
      }
      .product-sku {
        font-size: 12px;
        color: #888;
      }
      .total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
      }
      .total-label {
        font-size: 16px;
        font-weight: 600;
      }
      .total-value {
        font-size: 20px;
        font-weight: 700;
        color: #1565c0;
      }

      /* Actions */
      .actions-row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .no-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #888;
        font-size: 14px;
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
export class OrderDetailComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  actionLoading = false;
  itemCols = ['product', 'qty', 'price', 'subtotal'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    public auth: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.orderService.getOrder(id).subscribe({
      next: (res) => {
        this.order = res.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get timeline() {
    if (!this.order) return [];
    const o = this.order;
    const isCancelled = o.status === 'CANCELLED';

    return [
      {
        label: 'Order Placed',
        icon: 'shopping_cart',
        status: 'PENDING',
        done: true,
        cancelled: false,
        time: o.createdAt,
      },
      {
        label: 'Confirmed',
        icon: 'check_circle',
        status: 'CONFIRMED',
        done: !!o.confirmedAt,
        cancelled: false,
        time: o.confirmedAt,
      },
      {
        label: 'Shipped',
        icon: 'local_shipping',
        status: 'SHIPPED',
        done: !!o.shippedAt,
        cancelled: false,
        time: o.shippedAt,
      },
      {
        label: 'Delivered',
        icon: 'done_all',
        status: 'DELIVERED',
        done: !!o.deliveredAt,
        cancelled: false,
        time: o.deliveredAt,
      },
      ...(isCancelled
        ? [
            {
              label: 'Cancelled',
              icon: 'cancel',
              status: 'CANCELLED',
              done: false,
              cancelled: true,
              time: o.createdAt,
            },
          ]
        : []),
    ];
  }

  ship(): void {
    if (!this.order) return;
    this.actionLoading = true;
    this.orderService.shipOrder(this.order.id).subscribe({
      next: () => {
        this.order!.status = 'SHIPPED';
        this.order!.shippedAt = new Date().toISOString();
        this.actionLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Order shipped successfully', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.actionLoading = false;
        this.snackBar.open(err.error?.message || 'Failed to ship', 'Close', { duration: 4000 });
      },
    });
  }

  deliver(): void {
    if (!this.order) return;
    this.actionLoading = true;
    this.orderService.deliverOrder(this.order.id).subscribe({
      next: () => {
        this.order!.status = 'DELIVERED';
        this.order!.deliveredAt = new Date().toISOString();
        this.actionLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Order delivered', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.actionLoading = false;
        this.snackBar.open(err.error?.message || 'Failed to deliver', 'Close', { duration: 4000 });
      },
    });
  }

  cancelPrompt(): void {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;
    this.actionLoading = true;
    this.orderService.cancelOrder(this.order!.id, reason).subscribe({
      next: () => {
        this.order!.status = 'CANCELLED';
        this.order!.cancellationReason = reason;
        this.actionLoading = false;
        this.cdr.detectChanges();
        this.snackBar.open('Order cancelled', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.actionLoading = false;
        this.snackBar.open(err.error?.message || 'Failed to cancel', 'Close', { duration: 4000 });
      },
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

  goBack(): void {
    this.router.navigate(['/orders']);
  }
}
