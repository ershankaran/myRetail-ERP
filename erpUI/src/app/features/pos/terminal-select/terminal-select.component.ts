import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-terminal-select',
  standalone: true,
  imports: [RouterLink, MatCard, MatCardContent, MatButton, MatIcon],
  template: `
    <div class="page-container">
      <h2>Select Terminal</h2>
      <div class="grid">
        @for (t of terminals; track t.code) {
          <mat-card class="t-card">
            <mat-card-content>
              <mat-icon class="t-icon">point_of_sale</mat-icon>
              <h3>{{ t.code }}</h3>
              <p>{{ t.store }}</p>
              <button
                mat-raised-button
                color="primary"
                [routerLink]="['/pos/terminal', t.code]"
                [queryParams]="{ storeId: t.storeId }"
              >
                Open Terminal
              </button>
            </mat-card-content>
          </mat-card>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 16px;
      }
      .t-card mat-card-content {
        text-align: center;
        padding: 24px !important;
      }
      .t-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #3f51b5;
      }
      h3 {
        margin: 8px 0 4px;
      }
      p {
        color: #666;
        margin-bottom: 16px;
      }
    `,
  ],
})
export class TerminalSelectComponent {
  terminals = [
    { code: 'STORE1-T1', store: 'Chennai Store', storeId: 'STORE-CHENNAI-001' },
    { code: 'STORE1-T2', store: 'Chennai Store', storeId: 'STORE-CHENNAI-001' },
  ];
}
