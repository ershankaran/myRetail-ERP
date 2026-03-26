import { Routes } from '@angular/router';

export const inventoryRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./product-list/product-list.component').then((m) => m.ProductListComponent),
  },
  {
    path: 'low-stock',
    loadComponent: () => import('./low-stock/low-stock.component').then((m) => m.LowStockComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./product-detail/product-detail.component').then((m) => m.ProductDetailComponent),
  },
];
