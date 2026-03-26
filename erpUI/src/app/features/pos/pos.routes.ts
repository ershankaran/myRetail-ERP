import { Routes } from '@angular/router';

export const posRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./terminal-select/terminal-select.component').then((m) => m.TerminalSelectComponent),
  },
  {
    path: 'terminal/:terminalId',
    loadComponent: () =>
      import('./billing-screen/billing-screen.component').then((m) => m.BillingScreenComponent),
  },
  {
    path: 'terminal/:terminalId/sales',
    loadComponent: () =>
      import('./sales-history/sales-history.component').then((m) => m.SalesHistoryComponent),
  },
];
