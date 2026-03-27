import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { FinanceService } from '../../../core/services/finance.service';
import { LedgerAccount, AccountType } from '../../../shared/models/finance.model';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [
    DecimalPipe,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatButtonModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <button mat-button [routerLink]="['/finance']" class="back-btn">
            <mat-icon>arrow_back</mat-icon> Finance
          </button>
          <h2>Ledger Accounts</h2>
        </div>
        <div class="totals-row">
          <div class="total-chip assets">Assets ₹{{ totalByType('ASSET') | number: '1.2-2' }}</div>
          <div class="total-chip liabilities">
            Liabilities ₹{{ totalByType('LIABILITY') | number: '1.2-2' }}
          </div>
          <div class="total-chip revenue">
            Revenue ₹{{ totalByType('REVENUE') | number: '1.2-2' }}
          </div>
          <div class="total-chip expenses">
            Expenses ₹{{ totalByType('EXPENSE') | number: '1.2-2' }}
          </div>
        </div>
      </div>

      <!-- Accounting Equation -->
      @if (!loading && accounts.length > 0) {
        <mat-card class="equation-card">
          <mat-card-content>
            <div class="equation">
              <div class="eq-side">
                <div class="eq-label">Assets</div>
                <div class="eq-value">₹{{ totalByType('ASSET') | number: '1.2-2' }}</div>
              </div>
              <div class="eq-operator">=</div>
              <div class="eq-side">
                <div class="eq-label">Liabilities</div>
                <div class="eq-value">₹{{ totalByType('LIABILITY') | number: '1.2-2' }}</div>
              </div>
              <div class="eq-operator">+</div>
              <div class="eq-side">
                <div class="eq-label">Equity (Rev − Exp)</div>
                <div class="eq-value">₹{{ equity | number: '1.2-2' }}</div>
              </div>
              <div class="eq-operator">=</div>
              <div class="eq-side">
                <div class="eq-label">Check</div>
                <div
                  class="eq-value"
                  [class.balanced]="isBalanced"
                  [class.unbalanced]="!isBalanced"
                >
                  {{ isBalanced ? '✅ Balanced' : '❌ Unbalanced' }}
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }

      @if (loading) {
        <div class="center"><mat-spinner diameter="48"></mat-spinner></div>
      }

      @if (!loading) {
        @for (group of accountGroups; track group.type) {
          <div class="group-section">
            <div class="group-header">
              <mat-icon class="group-icon">{{ groupIcon(group.type) }}</mat-icon>
              <span>{{ group.type }}</span>
              <span class="group-total"> ₹{{ totalByType(group.type) | number: '1.2-2' }} </span>
            </div>
            <mat-card class="accounts-card">
              <mat-card-content>
                @for (acc of group.accounts; track acc.id) {
                  <div class="account-row">
                    <div class="account-code">{{ acc.accountCode }}</div>
                    <div class="account-name">{{ acc.accountName }}</div>
                    <div
                      class="account-balance"
                      [class.positive]="acc.currentBalance > 0"
                      [class.zero]="acc.currentBalance === 0"
                    >
                      ₹{{ acc.currentBalance | number: '1.2-2' }}
                    </div>
                    <div class="account-updated">
                      {{ acc.lastUpdated | date: 'dd MMM, HH:mm' }}
                    </div>
                  </div>
                  @if (!$last) {
                    <mat-divider></mat-divider>
                  }
                }
              </mat-card-content>
            </mat-card>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        margin-bottom: 20px;
        h2 {
          font-size: 24px;
          font-weight: 600;
          margin: 4px 0 0;
        }
      }
      .back-btn {
        color: #666;
      }
      .totals-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .total-chip {
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
      }
      .total-chip.assets {
        background: #e3f2fd;
        color: #1565c0;
      }
      .total-chip.liabilities {
        background: #fff3e0;
        color: #e65100;
      }
      .total-chip.revenue {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .total-chip.expenses {
        background: #fce4ec;
        color: #c62828;
      }

      /* Accounting equation */
      .equation-card {
        border-radius: 12px !important;
        margin-bottom: 24px;
        background: linear-gradient(135deg, #f5f7fa, #e8eaf6) !important;
      }
      .equation-card mat-card-content {
        padding: 20px !important;
      }
      .equation {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .eq-side {
        text-align: center;
      }
      .eq-label {
        font-size: 12px;
        color: #888;
      }
      .eq-value {
        font-size: 18px;
        font-weight: 700;
        color: #1e2a3a;
        margin-top: 4px;
      }
      .eq-operator {
        font-size: 24px;
        font-weight: 700;
        color: #888;
      }
      .balanced {
        color: #2e7d32;
      }
      .unbalanced {
        color: #c62828;
      }

      .center {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 300px;
      }

      /* Account groups */
      .group-section {
        margin-bottom: 20px;
      }
      .group-header {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #1e2a3a;
      }
      .group-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
        color: #3f51b5;
      }
      .group-total {
        margin-left: auto;
        font-size: 16px;
        font-weight: 700;
        color: #3f51b5;
      }

      .accounts-card {
        border-radius: 12px !important;
      }
      .accounts-card mat-card-content {
        padding: 0 !important;
      }
      .account-row {
        display: flex;
        align-items: center;
        padding: 14px 20px;
        gap: 16px;
      }
      .account-code {
        font-family: monospace;
        font-size: 13px;
        color: #1565c0;
        width: 60px;
        flex-shrink: 0;
      }
      .account-name {
        flex: 1;
        font-size: 14px;
        font-weight: 500;
      }
      .account-balance {
        font-size: 15px;
        font-weight: 700;
        color: #999;
        text-align: right;
        min-width: 120px;
      }
      .account-balance.positive {
        color: #2e7d32;
      }
      .account-balance.zero {
        color: #bbb;
      }
      .account-updated {
        font-size: 12px;
        color: #aaa;
        min-width: 110px;
        text-align: right;
      }
    `,
  ],
})
export class LedgerComponent implements OnInit {
  accounts: LedgerAccount[] = [];
  loading = true;
  readonly types: AccountType[] = ['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE'];

  constructor(
    private finance: FinanceService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.finance.getLedger().subscribe({
      next: (res) => {
        this.accounts = res.data ?? [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get accountGroups() {
    return this.types
      .map((type) => ({
        type,
        accounts: this.accounts.filter((a) => a.accountType === type),
      }))
      .filter((g) => g.accounts.length > 0);
  }

  totalByType(type: string): number {
    return this.accounts
      .filter((a) => a.accountType === type)
      .reduce((sum, a) => sum + a.currentBalance, 0);
  }

  get equity(): number {
    return this.totalByType('REVENUE') - this.totalByType('EXPENSE');
  }

  get isBalanced(): boolean {
    const assets = this.totalByType('ASSET');
    const liabilities = this.totalByType('LIABILITY');
    return Math.abs(assets - (liabilities + this.equity)) < 0.01;
  }

  groupIcon(type: string): string {
    const map: Record<string, string> = {
      ASSET: 'account_balance_wallet',
      LIABILITY: 'money_off',
      REVENUE: 'trending_up',
      EXPENSE: 'trending_down',
    };
    return map[type] ?? 'circle';
  }
}
