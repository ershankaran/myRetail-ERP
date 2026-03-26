import { Component } from '@angular/core';
import { MatToolbar, MatToolbarModule } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatIcon, MatToolbar],
  template: `
    <mat-toolbar class="app-header">
      <span class="header-title">myRetail ERP</span>
      <span class="spacer"></span>
      <mat-icon>person</mat-icon>
      <span class="header-email">{{ auth.user()?.email }}</span>
    </mat-toolbar>
  `,
  styles: [
    `
      .app-header {
        background: #fff !important;
        color: #333 !important;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
        height: 56px;
        gap: 8px;
      }
      .header-title {
        font-size: 18px;
        font-weight: 600;
        color: #3f51b5;
      }
      .spacer {
        flex: 1;
      }
      .header-email {
        font-size: 14px;
        color: #666;
      }
    `,
  ],
})
export class HeaderComponent {
  constructor(public auth: AuthService) {}
}
