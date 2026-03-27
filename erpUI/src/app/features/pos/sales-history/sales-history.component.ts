import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { PosService } from '../../../core/services/pos.service';
import { AuthService } from '../../../core/services/auth.service';
import { Sale } from '../../../shared/models/pos.model';

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <button mat-button (click)="goBack()" class="back-btn">
            <mat-icon>arrow_back</mat-icon> Back to Billing
          </button>
          <h2>Sales History — {{ terminalId }}</h2>
        </div>
        <div class="header-stats">
          <div class="stat">
            <span class="stat-val">{{ completedSales.length }}</span>
            <span class="stat-lbl">Completed</span>
          </div>
          <div class="stat voided">
            <span class="stat-val">{{ voidedSales.length }}</span>
            <span class="stat-lbl">Voided</span>
          </div>
          <div class="stat revenue">
            <span class="stat-val"> ₹{{ totalRevenue | number: '1.2-2' }} </span>
            <span class="stat-lbl">Total Revenue</span>
          </div>
        </div>
      </div>

      @if (loading) {
        <div class="center"><mat-spinner diameter="48"></mat-spinner></div>
      }

      @if (!loading) {
        <mat-card>
          <mat-card-content>
            <table mat-table [dataSource]="sales">
              <ng-container matColumnDef="receipt">
                <th mat-header-cell *matHeaderCellDef>Receipt #</th>
                <td mat-cell *matCellDef="let s">
                  <span class="receipt-no">{{ s.receiptNumber }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="time">
                <th mat-header-cell *matHeaderCellDef>Time</th>
                <td mat-cell *matCellDef="let s">
                  {{ s.createdAt | date: 'dd MMM, HH:mm' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="items">
                <th mat-header-cell *matHeaderCellDef>Items</th>
                <td mat-cell *matCellDef="let s">{{ s.items?.length ?? 0 }}</td>
              </ng-container>

              <ng-container matColumnDef="total">
                <th mat-header-cell *matHeaderCellDef>Total</th>
                <td mat-cell *matCellDef="let s">
                  <strong [class.voided-amount]="s.status === 'VOIDED'">
                    ₹{{ s.totalAmount | number: '1.2-2' }}
                  </strong>
                </td>
              </ng-container>

              <ng-container matColumnDef="payment">
                <th mat-header-cell *matHeaderCellDef>Payment</th>
                <td mat-cell *matCellDef="let s">{{ s.paymentMethod }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let s">
                  <span [class]="'badge ' + (s.status === 'COMPLETED' ? 'success' : 'error')">
                    {{ s.status }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let s">
                  @if (s.status === 'COMPLETED' && auth.hasRole('ADMIN', 'STORE_MANAGER')) {
                    <button
                      mat-icon-button
                      color="warn"
                      (click)="voidPrompt(s)"
                      matTooltip="Void sale"
                    >
                      <mat-icon>cancel</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let r; columns: cols"></tr>
            </table>

            @if (sales.length === 0) {
              <div class="empty">
                <mat-icon>receipt_long</mat-icon>
                <p>No sales found for this terminal</p>
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
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 20px;
        h2 {
          font-size: 22px;
          font-weight: 600;
          margin: 4px 0 0;
        }
      }
      .back-btn {
        color: #666;
        margin-bottom: 4px;
      }
      .header-stats {
        display: flex;
        gap: 20px;
      }
      .stat {
        text-align: center;
        padding: 8px 16px;
        background: #f5f7fa;
        border-radius: 8px;
      }
      .stat-val {
        display: block;
        font-size: 22px;
        font-weight: 700;
      }
      .stat-lbl {
        font-size: 12px;
        color: #888;
      }
      .stat.voided .stat-val {
        color: #c62828;
      }
      .stat.revenue .stat-val {
        color: #2e7d32;
      }

      .center {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 300px;
      }
      .receipt-no {
        font-family: monospace;
        font-size: 13px;
        color: #1565c0;
      }
      .voided-amount {
        text-decoration: line-through;
        color: #999;
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
        padding: 0 !important;
      }
    `,
  ],
})
export class SalesHistoryComponent implements OnInit {
  terminalId = '';
  storeId = '';
  sales: Sale[] = [];
  loading = true;
  cols = ['receipt', 'time', 'items', 'total', 'payment', 'status', 'actions'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private posService: PosService,
    public auth: AuthService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.terminalId = this.route.snapshot.paramMap.get('terminalId')!;
    this.storeId = this.route.snapshot.queryParamMap.get('storeId') ?? 'STORE-CHENNAI-001';
    this.load();
  }

  load(): void {
    this.posService.getSalesByTerminal(this.terminalId).subscribe({
      next: (res) => {
        this.sales = res.data ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get completedSales(): Sale[] {
    return this.sales.filter((s) => s.status === 'COMPLETED');
  }

  get voidedSales(): Sale[] {
    return this.sales.filter((s) => s.status === 'VOIDED');
  }

  get totalRevenue(): number {
    return this.completedSales.reduce((sum, s) => sum + s.totalAmount, 0);
  }

  voidPrompt(sale: Sale): void {
    const reason = prompt('Enter void reason:');
    if (!reason) return;

    this.posService.voidSale(sale.saleId, reason).subscribe({
      next: () => {
        sale.status = 'VOIDED';
        this.cdr.detectChanges();
        this.snackBar.open('Sale voided', 'Close', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to void sale', 'Close', {
          duration: 4000,
        });
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/pos/terminal', this.terminalId], {
      queryParams: { storeId: this.storeId },
    });
  }
}
