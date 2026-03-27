import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { FinanceService } from '../../../core/services/finance.service';
import {
  JournalEntry,
  JournalEntryStatus,
  ReferenceType,
} from '../../../shared/models/finance.model';

import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-journal-entries',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatSelectModule,
    RouterLink,
    MatFormFieldModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <button mat-button [routerLink]="['/finance']" class="back-btn">
            <mat-icon>arrow_back</mat-icon> Finance
          </button>
          <h2>Journal Entries</h2>
        </div>
        <div class="filters">
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Type</mat-label>
            <mat-select [(ngModel)]="filterType" (ngModelChange)="applyFilter()">
              <mat-option value="ALL">All Types</mat-option>
              <mat-option value="POS_SALE">POS Sale</mat-option>
              <mat-option value="POS_VOID">POS Void</mat-option>
              <mat-option value="ONLINE_ORDER">Online Order</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="filterStatus" (ngModelChange)="applyFilter()">
              <mat-option value="ALL">All</mat-option>
              <mat-option value="POSTED">Posted</mat-option>
              <mat-option value="REVERSED">Reversed</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      @if (loading) {
        <div class="center"><mat-spinner diameter="48"></mat-spinner></div>
      }

      @if (!loading) {
        <mat-card>
          <mat-card-content>
            <table mat-table [dataSource]="filtered">
              <ng-container matColumnDef="entryNumber">
                <th mat-header-cell *matHeaderCellDef>Entry #</th>
                <td mat-cell *matCellDef="let e">
                  <span class="entry-no">{{ e.entryNumber }}</span>
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
                  <span class="desc">{{ e.description }}</span>
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

              <ng-container matColumnDef="postedBy">
                <th mat-header-cell *matHeaderCellDef>Posted By</th>
                <td mat-cell *matCellDef="let e">
                  {{ e.postedBy?.split('@')[0] }}
                </td>
              </ng-container>

              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef>Date</th>
                <td mat-cell *matCellDef="let e">
                  {{ e.createdAt | date: 'dd MMM, HH:mm' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="expand">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let e">
                  <button mat-icon-button (click)="toggleExpand(e); $event.stopPropagation()">
                    <mat-icon>
                      {{ expandedId === e.id ? 'expand_less' : 'expand_more' }}
                    </mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr
                mat-row
                *matRowDef="let r; columns: cols"
                class="main-row"
                (click)="toggleExpand(r)"
              ></tr>
            </table>

            <!-- Expanded lines shown BELOW the table, not inside it -->
            @for (e of filtered; track e.id) {
              @if (expandedId === e.id) {
                <div class="lines-panel">
                  <table class="lines-table">
                    <tr class="lines-header">
                      <th>Account Code</th>
                      <th>Account Name</th>
                      <th>Debit</th>
                      <th>Credit</th>
                    </tr>
                    @for (line of e.lines; track line.id) {
                      <tr class="lines-row">
                        <td class="mono">{{ line.accountCode }}</td>
                        <td>{{ line.accountName }}</td>
                        <td class="debit">
                          {{
                            line.entryType === 'DEBIT' ? '₹' + (line.amount | number: '1.2-2') : '—'
                          }}
                        </td>
                        <td class="credit">
                          {{
                            line.entryType === 'CREDIT'
                              ? '₹' + (line.amount | number: '1.2-2')
                              : '—'
                          }}
                        </td>
                      </tr>
                    }
                    <tr class="lines-total">
                      <td colspan="2">Total</td>
                      <td class="debit">₹{{ e.totalAmount | number: '1.2-2' }}</td>
                      <td class="credit">₹{{ e.totalAmount | number: '1.2-2' }}</td>
                    </tr>
                  </table>
                </div>
              }
            }

            @if (filtered.length === 0) {
              <div class="empty">
                <mat-icon>receipt_long</mat-icon>
                <p>No journal entries found</p>
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
      .filters {
        display: flex;
        gap: 12px;
      }
      .filter-field {
        width: 160px;
      }

      .center {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 300px;
      }
      .entry-no {
        font-family: monospace;
        font-size: 13px;
        color: #1565c0;
      }
      .desc {
        font-size: 13px;
        max-width: 240px;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      table {
        width: 100%;
      }
      .main-row {
        cursor: pointer;
      }
      .main-row:hover {
        background: #f5f5f5;
      }
      .detail-row {
        height: 0;
      }

      /* Expanded lines */
      .lines-panel {
        padding: 16px 24px;
        background: #f9fafb;
        border-top: 1px solid #e0e0e0;
      }
      .lines-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .lines-header th {
        text-align: left;
        padding: 8px 12px;
        border-bottom: 2px solid #e0e0e0;
        font-weight: 600;
        color: #555;
      }
      .lines-row td {
        padding: 8px 12px;
        border-bottom: 1px solid #eee;
      }
      .lines-total td {
        padding: 8px 12px;
        font-weight: 700;
        border-top: 2px solid #e0e0e0;
      }
      .mono {
        font-family: monospace;
        color: #1565c0;
      }
      .debit {
        color: #c62828;
      }
      .credit {
        color: #2e7d32;
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

      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      .page-header h2 {
        font-size: 24px;
        font-weight: 600;
        margin: 4px 0 0;
      }
      .back-btn {
        color: #666;
        margin-bottom: 4px;
      }
    `,
  ],
})
export class JournalEntriesComponent implements OnInit {
  entries: JournalEntry[] = [];
  filtered: JournalEntry[] = [];
  loading = true;
  filterType = 'ALL';
  filterStatus = 'ALL';
  expandedId: string | null = null;
  cols = ['entryNumber', 'type', 'description', 'amount', 'status', 'postedBy', 'date', 'expand'];

  constructor(
    private finance: FinanceService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.finance.getJournalEntries().subscribe({
      next: (res) => {
        this.entries = res.data ?? [];
        this.filtered = [...this.entries];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilter(): void {
    this.filtered = this.entries.filter((e) => {
      const typeMatch = this.filterType === 'ALL' || e.referenceType === this.filterType;
      const statusMatch = this.filterStatus === 'ALL' || e.status === this.filterStatus;
      return typeMatch && statusMatch;
    });
  }

  toggleExpand(entry: JournalEntry): void {
    this.expandedId = this.expandedId === entry.id ? null : entry.id;
    this.cdr.detectChanges();
  }

  typeLabel(type: string): string {
    const map: Record<string, string> = {
      POS_SALE: 'POS Sale',
      POS_VOID: 'POS Void',
      ONLINE_ORDER: 'Online Order',
      PAYROLL: 'Payroll',
    };
    return map[type] ?? type;
  }

  typeClass(type: string): string {
    const map: Record<string, string> = {
      POS_SALE: 'info',
      POS_VOID: 'error',
      ONLINE_ORDER: 'success',
      PAYROLL: 'neutral',
    };
    return map[type] ?? 'neutral';
  }
}
