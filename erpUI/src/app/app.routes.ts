import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'inventory',
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then((m) => m.inventoryRoutes),
      },
      {
        path: 'orders',
        loadChildren: () => import('./features/orders/orders.routes').then((m) => m.orderRoutes),
      },
      {
        path: 'pos',
        loadChildren: () => import('./features/pos/pos.routes').then((m) => m.posRoutes),
      },
      {
        path: 'finance',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'FINANCE'] },
        loadChildren: () => import('./features/finance/finance.route').then((m) => m.financeRoutes),
      },
      {
        path: 'iam',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () => import('./features/iam/iam.routes').then((m) => m.iamRoutes),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
