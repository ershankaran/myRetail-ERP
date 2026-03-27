import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface Terminal {
  code: string;
  store: string;
  storeId: string;
}

@Component({
  selector: 'app-terminal-select',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>Point of Sale</h2>
        <p class="subtitle">Select a terminal to begin billing</p>
      </div>

      <div class="terminals-grid">
        @for (t of terminals; track t.code) {
          <mat-card class="terminal-card" (click)="open(t)">
            <mat-card-content>
              <div class="terminal-icon-wrap">
                <mat-icon class="terminal-icon">point_of_sale</mat-icon>
              </div>
              <h3 class="terminal-code">{{ t.code }}</h3>
              <p class="terminal-store">{{ t.store }}</p>
              <div class="card-actions">
                <button
                  mat-raised-button
                  color="primary"
                  class="open-btn"
                  (click)="open(t); $event.stopPropagation()"
                >
                  <mat-icon>point_of_sale</mat-icon> Open
                </button>
                <button
                  mat-stroked-button
                  class="history-btn"
                  (click)="openHistory(t); $event.stopPropagation()"
                >
                  <mat-icon>history</mat-icon> History
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        margin-bottom: 32px;
      }
      .page-header h2 {
        font-size: 24px;
        font-weight: 600;
        margin: 0 0 6px;
      }
      .subtitle {
        color: #888;
        margin: 0;
      }

      .terminals-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 20px;
      }

      .terminal-card {
        border-radius: 16px !important;
        cursor: pointer;
        transition:
          transform 0.15s,
          box-shadow 0.15s;
      }
      .terminal-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12) !important;
      }
      .terminal-card mat-card-content {
        padding: 28px 20px !important;
        text-align: center;
      }
      .terminal-icon-wrap {
        width: 64px;
        height: 64px;
        border-radius: 16px;
        background: #e8eaf6;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 16px;
      }
      .terminal-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: #3f51b5;
      }
      .terminal-code {
        font-size: 18px;
        font-weight: 700;
        color: #1e2a3a;
        margin: 0 0 6px;
      }
      .terminal-store {
        color: #888;
        font-size: 14px;
        margin: 0 0 20px;
      }
      .open-btn {
        width: 100%;
      }
      .card-actions {
        display: flex;
        gap: 8px;
      }
      .open-btn {
        flex: 1;
      }
      .history-btn {
        flex: 1;
      }
    `,
  ],
})
export class TerminalSelectComponent {
  terminals: Terminal[] = [
    { code: 'STORE1-T1', store: 'Chennai Store', storeId: 'STORE-CHENNAI-001' },
    { code: 'STORE1-T2', store: 'Chennai Store', storeId: 'STORE-CHENNAI-001' },
    { code: 'STORE1-T3', store: 'Chennai Store', storeId: 'STORE-CHENNAI-001' },
  ];

  constructor(private router: Router) {}

  open(t: Terminal): void {
    this.router.navigate(['/pos/terminal', t.code], { queryParams: { storeId: t.storeId } });
  }

  openHistory(t: Terminal): void {
    this.router.navigate(['/pos/terminal', t.code, 'sales'], {
      queryParams: { storeId: t.storeId },
    });
  }
}
