import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    SidebarComponent,
    HeaderComponent,
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
  ],
  template: `
    <mat-sidenav-container class="app-container">
      <mat-sidenav mode="side" opened class="app-sidenav">
        <app-sidebar />
      </mat-sidenav>
      <mat-sidenav-content class="app-content">
        <app-header />
        <main class="main-area">
          <router-outlet />
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [
    `
      .app-container {
        height: 100vh;
      }
      .app-sidenav {
        width: 240px;
        background: #1e2a3a;
        border-right: none;
      }
      .app-content {
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      .main-area {
        flex: 1;
        overflow-y: auto;
        background: #f5f7fa;
      }
    `,
  ],
})
export class LayoutComponent {}
