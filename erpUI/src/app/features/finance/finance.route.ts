import { Routes } from '@angular/router';

export const financeRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./finance-dashboard/finance-dashboard.component').then(
        (m) => m.FinanceDashboardComponent,
      ),
  },
  {
    path: 'journal-entries',
    loadComponent: () =>
      import('./journal-entries/journal-entries.component').then((m) => m.JournalEntriesComponent),
  },
  {
    path: 'ledger',
    loadComponent: () => import('./ledger/ledger.component').then((m) => m.LedgerComponent),
  },
];
