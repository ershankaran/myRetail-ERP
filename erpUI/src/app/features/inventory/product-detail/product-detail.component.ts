import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { InventoryService } from '../../../core/services/inventory.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product, StockTransaction } from '../../../shared/models/inventory.model';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <!-- Back button -->
      <button mat-button (click)="goBack()" class="back-btn">
        <mat-icon>arrow_back</mat-icon> Back to Inventory
      </button>

      @if (loading) {
        <div class="center"><mat-spinner diameter="48"></mat-spinner></div>
      }

      @if (!loading && product) {
        <div class="detail-grid">
          <!-- LEFT — Product Info -->
          <div class="left-panel">
            <mat-card class="info-card">
              <mat-card-content>
                <div class="product-header">
                  <div>
                    <div class="product-sku">{{ product.sku }}</div>
                    <h2 class="product-name">{{ product.name }}</h2>
                  </div>
                  <span [class]="'badge ' + statusClass">{{ statusLabel }}</span>
                </div>

                <mat-divider class="my-divider" />

                <div class="info-grid">
                  <div class="info-item">
                    <span class="info-label">Category</span>
                    <span class="info-value">{{ product.category }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Price</span>
                    <span class="info-value price"> ₹{{ product.price | number: '1.2-2' }} </span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Supplier</span>
                    <span class="info-value">{{ product.supplierName }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Warehouse</span>
                    <span class="info-value">{{ product.warehouseLocation }}</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Reorder Threshold</span>
                    <span class="info-value">{{ product.reorderThreshold }} units</span>
                  </div>
                  <div class="info-item">
                    <span class="info-label">Created</span>
                    <span class="info-value">
                      {{ product.createdAt | date: 'dd MMM yyyy' }}
                    </span>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>

            <!-- Stock Levels -->
            <mat-card class="stock-card">
              <mat-card-content>
                <h3 class="section-title">Stock Levels</h3>

                <div class="stock-row">
                  <div class="stock-item">
                    <div class="stock-number">{{ product.currentStock }}</div>
                    <div class="stock-label">Physical Stock</div>
                  </div>
                  <div class="stock-item reserved">
                    <div class="stock-number">{{ product.reservedStock }}</div>
                    <div class="stock-label">Reserved</div>
                  </div>
                  <div class="stock-item available">
                    <div class="stock-number">{{ product.availableStock }}</div>
                    <div class="stock-label">Available</div>
                  </div>
                </div>

                <div class="progress-section">
                  <div class="progress-label">
                    <span>Available stock</span>
                    <span>{{ availablePercent | number: '1.0-0' }}%</span>
                  </div>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="availablePercent"
                    [color]="progressColor"
                  >
                  </mat-progress-bar>
                  <div class="progress-hint">
                    Reorder threshold: {{ product.reorderThreshold }} units
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>

          <!-- RIGHT — Update Stock + History -->
          <div class="right-panel">
            <!-- Update Stock Form -->
            @if (auth.hasRole('ADMIN', 'STORE_MANAGER')) {
              <mat-card class="update-card">
                <mat-card-content>
                  <h3 class="section-title">Update Stock</h3>

                  <form [formGroup]="stockForm" (ngSubmit)="updateStock()">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Quantity Change</mat-label>
                      <input
                        matInput
                        type="number"
                        formControlName="quantityChange"
                        placeholder="e.g. 50 or -10"
                      />
                      <mat-hint>Positive = restock, Negative = adjustment</mat-hint>
                      @if (
                        stockForm.get('quantityChange')?.hasError('required') &&
                        stockForm.get('quantityChange')?.touched
                      ) {
                        <mat-error>Quantity is required</mat-error>
                      }
                      @if (stockForm.get('quantityChange')?.hasError('nonzero')) {
                        <mat-error>Quantity cannot be zero</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Reason</mat-label>
                      <mat-select formControlName="reason">
                        <mat-option value="RESTOCK">Restock</mat-option>
                        <mat-option value="ADJUSTMENT">Adjustment</mat-option>
                        <mat-option value="RETURN">Return</mat-option>
                        <mat-option value="DAMAGE">Damage</mat-option>
                        <mat-option value="TRANSFER">Transfer</mat-option>
                      </mat-select>
                      @if (
                        stockForm.get('reason')?.hasError('required') &&
                        stockForm.get('reason')?.touched
                      ) {
                        <mat-error>Reason is required</mat-error>
                      }
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Reference ID (optional)</mat-label>
                      <input
                        matInput
                        formControlName="referenceId"
                        placeholder="e.g. PO-2026-001"
                      />
                    </mat-form-field>

                    <button
                      mat-raised-button
                      color="primary"
                      type="submit"
                      class="submit-btn"
                      [disabled]="stockForm.invalid || updating"
                    >
                      @if (updating) {
                        <mat-spinner diameter="20"></mat-spinner>
                      } @else {
                        <mat-icon>sync</mat-icon> Update Stock
                      }
                    </button>
                  </form>
                </mat-card-content>
              </mat-card>
            }

            <!-- Stock Transaction History -->
            <mat-card class="history-card">
              <mat-card-content>
                <h3 class="section-title">Stock History</h3>

                @if (historyLoading) {
                  <div class="center-sm">
                    <mat-spinner diameter="32"></mat-spinner>
                  </div>
                }

                @if (!historyLoading) {
                  <table mat-table [dataSource]="history">
                    <ng-container matColumnDef="date">
                      <th mat-header-cell *matHeaderCellDef>Date</th>
                      <td mat-cell *matCellDef="let t">
                        {{ t.performedAt | date: 'dd MMM, HH:mm' }}
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="reason">
                      <th mat-header-cell *matHeaderCellDef>Reason</th>
                      <td mat-cell *matCellDef="let t">{{ t.reason }}</td>
                    </ng-container>

                    <ng-container matColumnDef="change">
                      <th mat-header-cell *matHeaderCellDef>Change</th>
                      <td mat-cell *matCellDef="let t">
                        <span [class]="t.quantityChange > 0 ? 'positive' : 'negative'">
                          {{ t.quantityChange > 0 ? '+' : '' }}{{ t.quantityChange }}
                        </span>
                      </td>
                    </ng-container>

                    <ng-container matColumnDef="before">
                      <th mat-header-cell *matHeaderCellDef>Before</th>
                      <td mat-cell *matCellDef="let t">{{ t.quantityBefore }}</td>
                    </ng-container>

                    <ng-container matColumnDef="after">
                      <th mat-header-cell *matHeaderCellDef>After</th>
                      <td mat-cell *matCellDef="let t">{{ t.quantityAfter }}</td>
                    </ng-container>

                    <ng-container matColumnDef="by">
                      <th mat-header-cell *matHeaderCellDef>By</th>
                      <td mat-cell *matCellDef="let t">
                        {{ t.performedBy?.split('@')[0] }}
                      </td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="historyCols"></tr>
                    <tr mat-row *matRowDef="let r; columns: historyCols"></tr>
                  </table>

                  @if (history.length === 0) {
                    <div class="empty-history">
                      <mat-icon>history</mat-icon>
                      <p>No stock transactions yet</p>
                    </div>
                  }
                }
              </mat-card-content>
            </mat-card>
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
      .center-sm {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 32px;
      }

      /* Grid layout */
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

      /* Product header */
      .product-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      .product-sku {
        font-size: 12px;
        color: #888;
        font-weight: 600;
        letter-spacing: 1px;
        margin-bottom: 4px;
      }
      .product-name {
        font-size: 22px;
        font-weight: 700;
        margin: 0;
        color: #1e2a3a;
      }

      .my-divider {
        margin: 16px 0;
      }

      /* Info grid */
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
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

      /* Stock levels */
      .section-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin: 0 0 16px;
      }
      .stock-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
        margin-bottom: 20px;
      }
      .stock-item {
        text-align: center;
        padding: 16px 8px;
        background: #f5f7fa;
        border-radius: 10px;
      }
      .stock-item.reserved {
        background: #fff3e0;
      }
      .stock-item.available {
        background: #e8f5e9;
      }
      .stock-number {
        font-size: 28px;
        font-weight: 700;
        color: #1e2a3a;
      }
      .stock-item.reserved .stock-number {
        color: #e65100;
      }
      .stock-item.available .stock-number {
        color: #2e7d32;
      }
      .stock-label {
        font-size: 12px;
        color: #888;
        margin-top: 4px;
      }
      .progress-section {
        margin-top: 8px;
      }
      .progress-label {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        color: #666;
        margin-bottom: 6px;
      }
      .progress-hint {
        font-size: 11px;
        color: #aaa;
        margin-top: 6px;
      }

      /* Update form */
      .full-width {
        width: 100%;
        margin-bottom: 16px;
      }
      .submit-btn {
        width: 100%;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      /* History table */
      .positive {
        color: #2e7d32;
        font-weight: 600;
      }
      .negative {
        color: #c62828;
        font-weight: 600;
      }
      .empty-history {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px;
        color: #bbb;
        mat-icon {
          font-size: 36px;
          width: 36px;
          height: 36px;
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
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  history: StockTransaction[] = [];
  loading = true;
  historyLoading = true;
  updating = false;
  stockForm: FormGroup;
  historyCols = ['date', 'reason', 'change', 'before', 'after', 'by'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private inv: InventoryService,
    public auth: AuthService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {
    this.stockForm = this.fb.group({
      quantityChange: [null, [Validators.required, this.nonZeroValidator]],
      reason: ['', Validators.required],
      referenceId: [''],
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.loadProduct(id);
    this.loadHistory(id);
  }

  loadProduct(id: string): void {
    this.inv.getProduct(id).subscribe({
      next: (res) => {
        this.product = res.data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadHistory(id: string): void {
    this.inv.getHistory(id).subscribe({
      next: (res) => {
        this.history = res.data;
        this.historyLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.historyLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  updateStock(): void {
    if (this.stockForm.invalid || !this.product) return;
    this.updating = true;

    const { quantityChange, reason, referenceId } = this.stockForm.value;

    this.inv
      .updateStock(this.product.id, {
        quantityChange: Number(quantityChange),
        reason,
        referenceId: referenceId || undefined,
      })
      .subscribe({
        next: (res) => {
          this.product = res.data;
          this.updating = false;
          this.stockForm.reset();
          this.loadHistory(this.product!.id);
          this.snackBar.open('Stock updated successfully', 'Close', {
            duration: 3000,
            panelClass: ['snack-success'],
          });
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.updating = false;
          this.snackBar.open(err.error?.message || 'Failed to update stock', 'Close', {
            duration: 4000,
            panelClass: ['snack-error'],
          });
          this.cdr.detectChanges();
        },
      });
  }

  get availablePercent(): number {
    if (!this.product || this.product.currentStock === 0) return 0;
    return (this.product.availableStock / this.product.currentStock) * 100;
  }

  get progressColor(): 'primary' | 'accent' | 'warn' {
    if (!this.product) return 'primary';
    if (this.product.availableStock === 0) return 'warn';
    if (this.product.availableStock <= this.product.reorderThreshold) return 'accent';
    return 'primary';
  }

  get statusLabel(): string {
    if (!this.product) return '';
    if (!this.product.active) return 'Decommissioned';
    if (this.product.currentStock === 0) return 'Depleted';
    if (this.product.currentStock <= this.product.reorderThreshold) return 'Low Stock';
    return 'Active';
  }

  get statusClass(): string {
    if (!this.product) return '';
    if (!this.product.active) return 'neutral';
    if (this.product.currentStock === 0) return 'error';
    if (this.product.currentStock <= this.product.reorderThreshold) return 'warning';
    return 'success';
  }

  nonZeroValidator(control: any) {
    return control.value === 0 ? { nonzero: true } : null;
  }

  goBack(): void {
    this.router.navigate(['/inventory']);
  }
}
