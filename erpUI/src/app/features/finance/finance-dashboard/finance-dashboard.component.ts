import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { FinanceService } from '../../../core/services/finance.service';
import { DailySummary, JournalEntry } from '../../../shared/models/finance.model';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>Finance</h2>
        <div class="header-actions">
          <button mat-stroked-button [routerLink]="['/finance/journal-entries']">
            <mat-icon>receipt_long</mat-icon> Journal Entries
          </button>
          <button mat-stroked-button [routerLink]="['/finance/ledger']">
            <mat-icon>account_balance</mat-icon> Ledger
          </button>
        </div>
      </div>

      <!-- Summary Cards -->
      @if (summaryLoading) {
        <div class="center"><mat-spinner diameter="40"></mat-spinner></div>
      }

      @if (!summaryLoading && summary) {
        <div class="cards-grid">
          <mat-card class="summary-card green-card">
            <mat-card-content>
              <div class="card-row">
                <div>
                  <div class="card-value">₹{{ summary.netRevenue | number: '1.2-2' }}</div>
                  <div class="card-label">Net Revenue</div>
                  <div class="card-date">{{ summary.date }}</div>
                </div>
                <mat-icon class="card-icon">payments</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card blue-card">
            <mat-card-content>
              <div class="card-row">
                <div>
                  <div class="card-value">₹{{ summary.posSalesRevenue | number: '1.2-2' }}</div>
                  <div class="card-label">POS Revenue</div>
                  <div class="card-sub">{{ summary.posTransactions }} transactions</div>
                </div>
                <mat-icon class="card-icon">point_of_sale</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card orange-card">
            <mat-card-content>
              <div class="card-row">
                <div>
                  <div class="card-value">₹{{ summary.onlineSalesRevenue | number: '1.2-2' }}</div>
                  <div class="card-label">Online Revenue</div>
                  <div class="card-sub">{{ summary.onlineTransactions }} orders</div>
                </div>
                <mat-icon class="card-icon">shopping_cart</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card red-card">
            <mat-card-content>
              <div class="card-row">
                <div>
                  <div class="card-value">{{ summary.totalVoids }}</div>
                  <div class="card-label">Total Voids</div>
                  <div class="card-sub">Today</div>
                </div>
                <mat-icon class="card-icon">undo</mat-icon>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- Recent Journal Entries -->
      <div class="section-header">
        <h3>Recent Journal Entries</h3>
        <button mat-button color="primary" [routerLink]="['/finance/journal-entries']">
          View All <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>

      @if (entriesLoading) {
        <div class="center"><mat-spinner diameter="40"></mat-spinner></div>
      }

      @if (!entriesLoading) {
        <mat-card>
          <mat-card-content>
            <table mat-table [dataSource]="recentEntries">
              <ng-container matColumnDef="entryNumber">
                <th mat-header-cell *matHeaderCellDef>Entry #</th>
                <td mat-cell *matCellDef="let e">
                  <span class="entry-number">{{ e.entryNumber }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let e">
                  <span [class]="'badge ' + typeClass(e.referenceType)">
                    {{ typeLabel(e.referenceType) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="description">
                <th mat-header-cell *matHeaderCellDef>Description</th>
                <td mat-cell *matCellDef="let e">
                  <span class="description">{{ e.description }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Amount</th>
                <td mat-cell *matCellDef="let e">
                  <strong>₹{{ e.totalAmount | number: '1.2-2' }}</strong>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let e">
                  <span [class]="'badge ' + (e.status === 'POSTED' ? 'success' : 'reversed')">
                    {{ e.status }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let e">
                  {{ e.createdAt | date: 'dd MMM, HH:mm' }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let r; columns: cols"></tr>
            </table>

            @if (recentEntries.length === 0) {
              <div class="empty">
                <mat-icon>receipt_long</mat-icon>
                <p>No journal entries yet</p>
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
        margin-bottom: 24px;
        h2 {
          font-size: 24px;
          font-weight: 600;
          margin: 0;
        }
      }
      .header-actions {
        display: flex;
        gap: 12px;
      }

      .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 16px;
        margin-bottom: 32px;
      }

      .summary-card mat-card-content {
        padding: 20px !important;
      }
      .card-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .card-value {
        font-size: 26px;
        font-weight: 700;
      }
      .card-label {
        font-size: 13px;
        color: #666;
        margin-top: 4px;
      }
      .card-date {
        font-size: 12px;
        color: #999;
        margin-top: 2px;
      }
      .card-sub {
        font-size: 12px;
        color: #999;
        margin-top: 2px;
      }
      .card-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        opacity: 0.2;
      }

      .green-card .card-value {
        color: #2e7d32;
      }
      .green-card .card-icon {
        color: #2e7d32;
      }
      .blue-card .card-value {
        color: #1565c0;
      }
      .blue-card .card-icon {
        color: #1565c0;
      }
      .orange-card .card-value {
        color: #e65100;
      }
      .orange-card .card-icon {
        color: #e65100;
      }
      .red-card .card-value {
        color: #c62828;
      }
      .red-card .card-icon {
        color: #c62828;
      }

      .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }
        button {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }

      .center {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 120px;
      }

      .entry-number {
        font-family: monospace;
        font-size: 13px;
        color: #1565c0;
      }
      .description {
        font-size: 13px;
        color: #555;
        max-width: 280px;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      table {
        width: 100%;
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px;
        color: #bbb;
        mat-icon {
          font-size: 40px;
          width: 40px;
          height: 40px;
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
export class FinanceDashboardComponent implements OnInit {
  summary: DailySummary | null = null;
  recentEntries: JournalEntry[] = [];
  summaryLoading = true;
  entriesLoading = true;
  cols = ['entryNumber', 'type', 'description', 'amount', 'status', 'date'];

  constructor(
    private finance: FinanceService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.finance.getDailySummary().subscribe({
      next: (res) => {
        this.summary = res.data;
        this.summaryLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.summaryLoading = false;
        this.cdr.detectChanges();
      },
    });

    this.finance.getJournalEntries().subscribe({
      next: (res) => {
        this.recentEntries = (res.data ?? []).slice(0, 10);
        this.entriesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.entriesLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      POS_SALE: 'POS Sale',
      POS_VOID: 'POS Void',
      ONLINE_ORDER: 'Online Order',
      PAYROLL: 'Payroll',
      PURCHASE_ORDER: 'Purchase',
    };
    return map[type] ?? type;
  }

  typeClass(type: string): string {
    const map: Record<string, string> = {
      POS_SALE: 'info',
      POS_VOID: 'error',
      ONLINE_ORDER: 'success',
      PAYROLL: 'neutral',
      PURCHASE_ORDER: 'warning',
    };
    return map[type] ?? 'neutral';
  }
}
