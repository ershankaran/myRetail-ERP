import { Routes } from '@angular/router';

export const iamRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./user-list/user-list.component').then((m) => m.UserListComponent),
  },
];
