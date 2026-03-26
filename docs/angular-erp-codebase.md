# myRetail ERP — Complete Angular 21 Codebase

**Angular Version:** 21 (Standalone Components)  
**Material Version:** 21.2.3  

---

## Project Setup

```bash
# Already done — app is running at localhost:4200
# Install Material
npm install @angular/material @angular/cdk
```

---

## File Structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── role.guard.ts
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts
│   │   ├── models/
│   │   │   └── user.model.ts
│   │   └── services/
│   │       ├── auth.service.ts
│   │       ├── inventory.service.ts
│   │       ├── order.service.ts
│   │       ├── pos.service.ts
│   │       ├── finance.service.ts
│   │       └── iam.service.ts
│   ├── shared/
│   │   └── models/
│   │       ├── api-response.model.ts
│   │       ├── inventory.model.ts
│   │       ├── order.model.ts
│   │       ├── pos.model.ts
│   │       └── finance.model.ts
│   ├── shell/
│   │   ├── layout/
│   │   │   ├── layout.component.ts
│   │   │   ├── layout.component.html
│   │   │   └── layout.component.scss
│   │   ├── sidebar/
│   │   │   ├── sidebar.component.ts
│   │   │   ├── sidebar.component.html
│   │   │   └── sidebar.component.scss
│   │   └── header/
│   │       ├── header.component.ts
│   │       ├── header.component.html
│   │       └── header.component.scss
│   ├── features/
│   │   ├── auth/
│   │   │   └── login/
│   │   │       ├── login.component.ts
│   │   │       ├── login.component.html
│   │   │       └── login.component.scss
│   │   ├── inventory/
│   │   │   ├── product-list/
│   │   │   ├── product-detail/
│   │   │   └── low-stock/
│   │   ├── orders/
│   │   │   ├── order-list/
│   │   │   └── order-detail/
│   │   ├── pos/
│   │   │   ├── terminal-select/
│   │   │   ├── billing-screen/
│   │   │   └── sales-history/
│   │   ├── finance/
│   │   │   ├── finance-dashboard/
│   │   │   ├── journal-entries/
│   │   │   └── ledger/
│   │   └── iam/
│   │       └── user-list/
│   ├── app.component.ts
│   ├── app.component.html
│   ├── app.routes.ts
│   └── app.config.ts
├── environments/
│   └── environment.ts
└── styles.scss
```

---

## Step 1 — Environment

### `src/environments/environment.ts`
```typescript
export const environment = {
  production: false,
  apiUrls: {
    iam:       'http://localhost:8081',
    inventory: 'http://localhost:8082',
    order:     'http://localhost:8083',
    finance:   'http://localhost:8084',
    pos:       'http://localhost:8086'
  }
};
```

---

## Step 2 — Global Styles

### `src/styles.scss`
```scss
@import '@angular/material/prebuilt-themes/azure-blue.css';

html, body {
  height: 100%;
  margin: 0;
  font-family: Roboto, sans-serif;
  background: #f5f7fa;
}

* { box-sizing: border-box; }

.page-container { padding: 24px; }
.spacer { flex: 1 1 auto; }

// ── Status Badges ─────────────────────────────────────────────
.badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  display: inline-block;

  &.success  { background: #e8f5e9; color: #2e7d32; }
  &.warning  { background: #fff3e0; color: #e65100; }
  &.error    { background: #ffebee; color: #c62828; }
  &.info     { background: #e3f2fd; color: #1565c0; }
  &.neutral  { background: #f5f5f5; color: #616161; }
  &.purple   { background: #f3e5f5; color: #6a1b9a; }
  &.reversed { background: #fce4ec; color: #880e4f; text-decoration: line-through; }
}

// ── Tables ─────────────────────────────────────────────────────
.mat-mdc-table {
  width: 100%;
  .mat-mdc-row:hover { background: #f5f5f5; cursor: pointer; }
}

// ── Cards ──────────────────────────────────────────────────────
.summary-card {
  .card-value {
    font-size: 28px;
    font-weight: 700;
    color: #1565c0;
    margin: 8px 0 4px;
  }
  .card-label {
    font-size: 13px;
    color: #666;
  }
}
```

### `src/index.html` — add inside `<head>`
```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

---

## Step 3 — Models

### `src/app/shared/models/api-response.model.ts`
```typescript
export interface ApiResponse<T> {
  status: 'SUCCESS' | 'ERROR';
  message: string;
  data: T;
  errors?: string[];
  timestamp: string;
}
```

### `src/app/core/models/user.model.ts`
```typescript
export type Role = 'ADMIN' | 'STORE_MANAGER' | 'CASHIER' | 'FINANCE' | 'HR';

export interface User {
  email: string;
  role: Role;
  token: string;
}
```

### `src/app/shared/models/inventory.model.ts`
```typescript
export type Category = 'ELECTRONICS' | 'CLOTHING' | 'FOOD' | 'FURNITURE' | 'SPORTS' | 'OTHER';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  supplierName: string;
  warehouseLocation: string;
  reorderThreshold: number;
  active: boolean;
  createdAt: string;
}

export interface StockTransaction {
  id: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityChange: number;
  reason: string;
  referenceId: string;
  performedBy: string;
  performedAt: string;
}

export interface UpdateStockRequest {
  quantityChange: number;
  reason: string;
  referenceId?: string;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description: string;
  category: Category;
  price: number;
  supplierName: string;
  warehouseLocation: string;
  reorderThreshold: number;
  initialQuantity: number;
}
```

### `src/app/shared/models/order.model.ts`
```typescript
export type OrderStatus =
  'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  totalAmount: number;
  cancellationReason: string | null;
  items: OrderItem[];
  createdAt: string;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface OrderItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CreateOrderRequest {
  items: CreateOrderItemRequest[];
}

export interface CreateOrderItemRequest {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}
```

### `src/app/shared/models/pos.model.ts`
```typescript
export type PaymentMethod = 'CASH' | 'CARD' | 'UPI';
export type SaleStatus = 'COMPLETED' | 'VOIDED' | 'PENDING_SYNC';

export interface CartItem {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface Cart {
  cartId: string;
  terminalId: string;
  storeId: string;
  cashierId: string;
  items: CartItem[];
  totalAmount: number;
  createdAt: string;
  expiresAt: string;
}

export interface Sale {
  saleId: string;
  terminalId: string;
  storeId: string;
  cashierId: string;
  customerId: string | null;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  items: SaleItem[];
  receiptNumber: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}
```

### `src/app/shared/models/finance.model.ts`
```typescript
export type AccountType = 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE';
export type EntryType = 'DEBIT' | 'CREDIT';
export type JournalEntryStatus = 'POSTED' | 'REVERSED';
export type ReferenceType = 'ONLINE_ORDER' | 'POS_SALE' | 'POS_VOID' | 'PAYROLL' | 'PURCHASE_ORDER';

export interface LedgerAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  currentBalance: number;
  lastUpdated: string;
}

export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  entryType: EntryType;
  amount: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  referenceType: ReferenceType;
  referenceId: string;
  description: string;
  totalAmount: number;
  status: JournalEntryStatus;
  postedBy: string;
  lines: JournalEntryLine[];
  createdAt: string;
}

export interface DailySummary {
  date: string;
  totalRevenue: number;
  posSalesRevenue: number;
  onlineSalesRevenue: number;
  totalVoids: number;
  netRevenue: number;
  totalTransactions: number;
  posTransactions: number;
  onlineTransactions: number;
}
```

---

## Step 4 — Services

### `src/app/core/services/auth.service.ts`
```typescript
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { User, Role } from '../models/user.model';

interface AuthData { token: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly _user = signal<User | null>(null);

  readonly user       = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly role       = computed(() => this._user()?.role ?? null);
  readonly token      = computed(() => this._user()?.token ?? null);

  constructor(private http: HttpClient, private router: Router) {
    const stored = sessionStorage.getItem('erp_user');
    if (stored) this._user.set(JSON.parse(stored));
  }

  login(email: string, password: string): Observable<ApiResponse<AuthData>> {
    return this.http
      .post<ApiResponse<AuthData>>(
        `${environment.apiUrls.iam}/auth/login`,
        { email, password }
      )
      .pipe(
        tap(res => {
          if (res.status === 'SUCCESS') {
            const payload = JSON.parse(atob(res.data.token.split('.')[1]));
            const user: User = { email, role: payload.role as Role, token: res.data.token };
            this._user.set(user);
            sessionStorage.setItem('erp_user', JSON.stringify(user));
          }
        })
      );
  }

  logout(): void {
    this._user.set(null);
    sessionStorage.removeItem('erp_user');
    this.router.navigate(['/login']);
  }

  hasRole(...roles: Role[]): boolean {
    const current = this.role();
    return current ? roles.includes(current) : false;
  }
}
```

### `src/app/core/services/inventory.service.ts`
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Product, CreateProductRequest, UpdateStockRequest, StockTransaction } from '../../shared/models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private base = `${environment.apiUrls.inventory}/inventory`;
  constructor(private http: HttpClient) {}

  getProducts(): Observable<ApiResponse<Product[]>> {
    return this.http.get<ApiResponse<Product[]>>(`${this.base}/products`);
  }
  getProduct(id: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${this.base}/products/${id}`);
  }
  getProductBySku(sku: string): Observable<ApiResponse<Product>> {
    return this.http.get<ApiResponse<Product>>(`${this.base}/products/sku/${sku}`);
  }
  getLowStock(): Observable<ApiResponse<Product[]>> {
    return this.http.get<ApiResponse<Product[]>>(`${this.base}/products/low-stock`);
  }
  createProduct(req: CreateProductRequest): Observable<ApiResponse<Product>> {
    return this.http.post<ApiResponse<Product>>(`${this.base}/products`, req);
  }
  updateStock(id: string, req: UpdateStockRequest): Observable<ApiResponse<Product>> {
    return this.http.patch<ApiResponse<Product>>(`${this.base}/products/${id}/stock`, req);
  }
  decommission(id: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/products/${id}`);
  }
  getHistory(id: string): Observable<ApiResponse<StockTransaction[]>> {
    return this.http.get<ApiResponse<StockTransaction[]>>(`${this.base}/products/${id}/transactions`);
  }
}
```

### `src/app/core/services/order.service.ts`
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Order, CreateOrderRequest, OrderStatus } from '../../shared/models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private base = environment.apiUrls.order;
  constructor(private http: HttpClient) {}

  createOrder(req: CreateOrderRequest): Observable<ApiResponse<Order>> {
    return this.http.post<ApiResponse<Order>>(`${this.base}/orders`, req);
  }
  getOrder(id: string): Observable<ApiResponse<Order>> {
    return this.http.get<ApiResponse<Order>>(`${this.base}/orders/${id}`);
  }
  getMyOrders(): Observable<ApiResponse<Order[]>> {
    return this.http.get<ApiResponse<Order[]>>(`${this.base}/orders/my-orders`);
  }
  getOrdersByStatus(status: OrderStatus): Observable<ApiResponse<Order[]>> {
    return this.http.get<ApiResponse<Order[]>>(`${this.base}/orders/status/${status}`);
  }
  shipOrder(id: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/orders/${id}/ship`, {});
  }
  cancelOrder(id: string, reason: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(
      `${this.base}/orders/${id}/cancel?reason=${encodeURIComponent(reason)}`, {}
    );
  }
  deliverOrder(id: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/orders/${id}/deliver`, {});
  }
}
```

### `src/app/core/services/pos.service.ts`
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Cart, Sale, PaymentMethod } from '../../shared/models/pos.model';

@Injectable({ providedIn: 'root' })
export class PosService {
  private base = `${environment.apiUrls.pos}/pos`;
  constructor(private http: HttpClient) {}

  getCart(terminalId: string, storeId: string): Observable<ApiResponse<Cart>> {
    return this.http.get<ApiResponse<Cart>>(
      `${this.base}/terminals/${terminalId}/cart?storeId=${storeId}`
    );
  }
  addItem(terminalId: string, item: {
    productId: string; sku: string; productName: string; quantity: number;
  }): Observable<ApiResponse<Cart>> {
    return this.http.post<ApiResponse<Cart>>(
      `${this.base}/terminals/${terminalId}/cart/items`, item
    );
  }
  removeItem(terminalId: string, sku: string): Observable<ApiResponse<Cart>> {
    return this.http.delete<ApiResponse<Cart>>(
      `${this.base}/terminals/${terminalId}/cart/items/${sku}`
    );
  }
  clearCart(terminalId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.base}/terminals/${terminalId}/cart`
    );
  }
  checkout(terminalId: string, storeId: string, paymentMethod: PaymentMethod): Observable<ApiResponse<Sale>> {
    return this.http.post<ApiResponse<Sale>>(
      `${this.base}/terminals/${terminalId}/checkout?storeId=${storeId}`,
      { paymentMethod }
    );
  }
  getSalesByTerminal(terminalId: string): Observable<ApiResponse<Sale[]>> {
    return this.http.get<ApiResponse<Sale[]>>(
      `${this.base}/terminals/${terminalId}/sales`
    );
  }
  voidSale(saleId: string, reason: string): Observable<ApiResponse<Sale>> {
    return this.http.patch<ApiResponse<Sale>>(
      `${this.base}/sales/${saleId}/void?reason=${encodeURIComponent(reason)}`, {}
    );
  }
}
```

### `src/app/core/services/finance.service.ts`
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { JournalEntry, LedgerAccount, DailySummary } from '../../shared/models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private base = `${environment.apiUrls.finance}/finance`;
  constructor(private http: HttpClient) {}

  getJournalEntries(): Observable<ApiResponse<JournalEntry[]>> {
    return this.http.get<ApiResponse<JournalEntry[]>>(`${this.base}/journal-entries`);
  }
  getLedger(): Observable<ApiResponse<LedgerAccount[]>> {
    return this.http.get<ApiResponse<LedgerAccount[]>>(`${this.base}/ledger`);
  }
  getDailySummary(date?: string): Observable<ApiResponse<DailySummary>> {
    const params = date ? `?date=${date}` : '';
    return this.http.get<ApiResponse<DailySummary>>(`${this.base}/reports/daily-summary${params}`);
  }
}
```

### `src/app/core/services/iam.service.ts`
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { Role } from '../models/user.model';

export interface RegisterRequest {
  email: string; password: string; fullName: string; role: Role;
}
export interface UserRecord {
  id: string; email: string; fullName: string; role: Role; createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class IamService {
  private base = `${environment.apiUrls.iam}/auth`;
  constructor(private http: HttpClient) {}

  register(req: RegisterRequest): Observable<ApiResponse<UserRecord>> {
    return this.http.post<ApiResponse<UserRecord>>(`${this.base}/register`, req);
  }
}
```

---

## Step 5 — Guards & Interceptor

### `src/app/core/guards/auth.guard.ts`
```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};
```

### `src/app/core/guards/role.guard.ts`
```typescript
import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/user.model';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth   = inject(AuthService);
  const router = inject(Router);
  const roles: Role[] = route.data['roles'];
  if (auth.hasRole(...roles)) return true;
  router.navigate(['/inventory']);
  return false;
};
```

### `src/app/core/interceptors/auth.interceptor.ts`
```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
```

---

## Step 6 — App Config & Routes

### `src/app/app.config.ts`
```typescript
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync()
  ]
};
```

### `src/app/app.routes.ts`
```typescript
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component')
        .then(m => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shell/layout/layout.component')
        .then(m => m.LayoutComponent),
    children: [
      {
        path: 'inventory',
        loadChildren: () =>
          import('./features/inventory/inventory.routes')
            .then(m => m.inventoryRoutes)
      },
      {
        path: 'orders',
        loadChildren: () =>
          import('./features/orders/orders.routes')
            .then(m => m.orderRoutes)
      },
      {
        path: 'pos',
        loadChildren: () =>
          import('./features/pos/pos.routes')
            .then(m => m.posRoutes)
      },
      {
        path: 'finance',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'FINANCE'] },
        loadChildren: () =>
          import('./features/finance/finance.routes')
            .then(m => m.financeRoutes)
      },
      {
        path: 'iam',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () =>
          import('./features/iam/iam.routes')
            .then(m => m.iamRoutes)
      },
      { path: '', redirectTo: 'inventory', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
```

### `src/app/app.component.ts`
```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class AppComponent {}
```

---

## Step 7 — Shell Components

### `src/app/shell/layout/layout.component.ts`
```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, SidebarComponent, HeaderComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {}
```

### `src/app/shell/layout/layout.component.html`
```html
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
```

### `src/app/shell/layout/layout.component.scss`
```scss
.app-container { height: 100vh; }
.app-sidenav   { width: 240px; background: #1e2a3a; border-right: none; }
.app-content   { display: flex; flex-direction: column; height: 100vh; }
.main-area     { flex: 1; overflow-y: auto; background: #f5f7fa; }
```

### `src/app/shell/sidebar/sidebar.component.ts`
```typescript
import { Component, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatDividerModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {

  navItems = [
    { label: 'Inventory',       icon: 'inventory_2',     route: '/inventory', roles: ['ADMIN','STORE_MANAGER','CASHIER','FINANCE'] },
    { label: 'Orders',          icon: 'shopping_cart',   route: '/orders',    roles: ['ADMIN','STORE_MANAGER','CASHIER'] },
    { label: 'Point of Sale',   icon: 'point_of_sale',   route: '/pos',       roles: ['ADMIN','STORE_MANAGER','CASHIER'] },
    { label: 'Finance',         icon: 'account_balance', route: '/finance',   roles: ['ADMIN','FINANCE'] },
    { label: 'User Management', icon: 'manage_accounts', route: '/iam',       roles: ['ADMIN'] }
  ];

  visibleItems = computed(() => {
    const role = this.auth.role();
    return this.navItems.filter(i => role ? i.roles.includes(role) : false);
  });

  constructor(public auth: AuthService) {}
}
```

### `src/app/shell/sidebar/sidebar.component.html`
```html
<div class="sidebar-wrapper">

  <div class="sidebar-logo">
    <mat-icon class="logo-icon">storefront</mat-icon>
    <span class="logo-text">myRetail ERP</span>
  </div>

  <div class="sidebar-user">
    <div class="user-avatar">
      {{ auth.user()?.email?.charAt(0)?.toUpperCase() }}
    </div>
    <div class="user-info">
      <div class="user-email">{{ auth.user()?.email }}</div>
      <div class="user-role">{{ auth.role() }}</div>
    </div>
  </div>

  <mat-divider class="sidebar-divider" />

  <nav class="sidebar-nav">
    @for (item of visibleItems(); track item.route) {
      <a [routerLink]="item.route"
         routerLinkActive="active"
         class="nav-item">
        <mat-icon>{{ item.icon }}</mat-icon>
        <span>{{ item.label }}</span>
      </a>
    }
  </nav>

  <div class="sidebar-footer">
    <mat-divider class="sidebar-divider" />
    <button class="nav-item logout-btn" (click)="auth.logout()">
      <mat-icon>logout</mat-icon>
      <span>Logout</span>
    </button>
  </div>

</div>
```

### `src/app/shell/sidebar/sidebar.component.scss`
```scss
.sidebar-wrapper {
  display: flex; flex-direction: column;
  height: 100%; background: #1e2a3a; color: #fff;
}
.sidebar-logo {
  display: flex; align-items: center; gap: 10px; padding: 20px 16px;
  .logo-icon { color: #64b5f6; font-size: 28px; width: 28px; height: 28px; }
  .logo-text  { font-size: 16px; font-weight: 700; }
}
.sidebar-user {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; margin: 0 8px 8px;
  background: rgba(255,255,255,0.05); border-radius: 8px;
  .user-avatar {
    width: 36px; height: 36px; border-radius: 50%; background: #3f51b5;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 16px; flex-shrink: 0;
  }
  .user-email { font-size: 12px; color: #ccc; }
  .user-role  { font-size: 11px; color: #64b5f6; font-weight: 600; }
}
.sidebar-divider { border-color: rgba(255,255,255,0.1) !important; margin: 4px 0; }
.sidebar-nav     { flex: 1; padding: 8px; }
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 12px; border-radius: 8px; margin-bottom: 2px;
  color: rgba(255,255,255,0.7); text-decoration: none;
  cursor: pointer; border: none; background: none;
  width: 100%; font-size: 14px; font-weight: 500;
  transition: all 0.2s ease;
  &:hover { background: rgba(255,255,255,0.08); color: #fff; }
  &.active { background: rgba(100,181,246,0.15); color: #64b5f6; }
}
.sidebar-footer  { padding: 8px; }
.logout-btn:hover { color: #ef5350 !important; }
```

### `src/app/shell/header/header.component.ts`
```typescript
import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  constructor(public auth: AuthService) {}
}
```

### `src/app/shell/header/header.component.html`
```html
<mat-toolbar class="app-header">
  <span class="header-title">myRetail ERP</span>
  <span class="spacer"></span>
  <mat-icon>person</mat-icon>
  <span class="header-email">{{ auth.user()?.email }}</span>
</mat-toolbar>
```

### `src/app/shell/header/header.component.scss`
```scss
.app-header {
  background: #fff !important; color: #333 !important;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1); height: 56px; gap: 8px;
  .header-title { font-size: 18px; font-weight: 600; color: #3f51b5; }
  .header-email { font-size: 14px; color: #666; }
}
```

---

## Step 8 — Login

### `src/app/features/auth/login/login.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  form: FormGroup;
  loading = false;
  error   = '';
  hidePassword = true;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error   = '';
    const { email, password } = this.form.value;

    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/inventory']);
      },
      error: (err) => {
        this.loading = false;
        this.error   = err.error?.message || 'Invalid email or password';
      }
    });
  }
}
```

### `src/app/features/auth/login/login.component.html`
```html
<div class="login-container">
  <mat-card class="login-card">

    <div class="login-header">
      <mat-icon class="login-logo">storefront</mat-icon>
      <h1 class="login-title">myRetail ERP</h1>
      <p class="login-subtitle">Sign in to your account</p>
    </div>

    <mat-card-content>
      <form [formGroup]="form" (ngSubmit)="submit()">

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email"
                 placeholder="admin@retailerp.com">
          <mat-icon matSuffix>email</mat-icon>
          @if (form.get('email')?.hasError('required') && form.get('email')?.touched) {
            <mat-error>Email is required</mat-error>
          }
          @if (form.get('email')?.hasError('email')) {
            <mat-error>Enter a valid email</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Password</mat-label>
          <input matInput [type]="hidePassword ? 'password' : 'text'"
                 formControlName="password">
          <button mat-icon-button matSuffix type="button"
                  (click)="hidePassword = !hidePassword">
            <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
            <mat-error>Password is required</mat-error>
          }
        </mat-form-field>

        @if (error) {
          <div class="error-message">
            <mat-icon>error_outline</mat-icon>
            {{ error }}
          </div>
        }

        <button mat-raised-button color="primary" type="submit"
                class="login-btn" [disabled]="form.invalid || loading">
          @if (loading) {
            <mat-spinner diameter="20" />
          } @else {
            Sign In
          }
        </button>

      </form>
    </mat-card-content>
  </mat-card>
</div>
```

### `src/app/features/auth/login/login.component.scss`
```scss
.login-container {
  min-height: 100vh; display: flex;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #1e2a3a 0%, #3f51b5 100%);
}
.login-card {
  width: 420px; padding: 32px;
  border-radius: 16px !important;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
}
.login-header {
  text-align: center; margin-bottom: 32px;
  .login-logo   { font-size: 56px; width: 56px; height: 56px; color: #3f51b5; }
  .login-title  { font-size: 24px; font-weight: 700; color: #1e2a3a; margin: 8px 0; }
  .login-subtitle { color: #666; font-size: 14px; margin: 0; }
}
.full-width    { width: 100%; margin-bottom: 16px; }
.error-message {
  display: flex; align-items: center; gap: 8px;
  color: #c62828; background: #ffebee;
  padding: 10px 14px; border-radius: 8px;
  font-size: 14px; margin-bottom: 16px;
  mat-icon { font-size: 18px; width: 18px; height: 18px; }
}
.login-btn {
  width: 100%; height: 48px; font-size: 16px;
  font-weight: 600; border-radius: 8px !important;
  display: flex; align-items: center; justify-content: center;
}
```

---

## Step 9 — Feature Routes

### `src/app/features/inventory/inventory.routes.ts`
```typescript
import { Routes } from '@angular/router';

export const inventoryRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./product-list/product-list.component')
        .then(m => m.ProductListComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./product-detail/product-detail.component')
        .then(m => m.ProductDetailComponent)
  },
  {
    path: 'alerts/low-stock',
    loadComponent: () =>
      import('./low-stock/low-stock.component')
        .then(m => m.LowStockComponent)
  }
];
```

### `src/app/features/orders/orders.routes.ts`
```typescript
import { Routes } from '@angular/router';

export const orderRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./order-list/order-list.component')
        .then(m => m.OrderListComponent)
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./order-detail/order-detail.component')
        .then(m => m.OrderDetailComponent)
  }
];
```

### `src/app/features/pos/pos.routes.ts`
```typescript
import { Routes } from '@angular/router';

export const posRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./terminal-select/terminal-select.component')
        .then(m => m.TerminalSelectComponent)
  },
  {
    path: 'terminal/:terminalId',
    loadComponent: () =>
      import('./billing-screen/billing-screen.component')
        .then(m => m.BillingScreenComponent)
  },
  {
    path: 'terminal/:terminalId/sales',
    loadComponent: () =>
      import('./sales-history/sales-history.component')
        .then(m => m.SalesHistoryComponent)
  }
];
```

### `src/app/features/finance/finance.routes.ts`
```typescript
import { Routes } from '@angular/router';

export const financeRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./finance-dashboard/finance-dashboard.component')
        .then(m => m.FinanceDashboardComponent)
  },
  {
    path: 'journal-entries',
    loadComponent: () =>
      import('./journal-entries/journal-entries.component')
        .then(m => m.JournalEntriesComponent)
  },
  {
    path: 'ledger',
    loadComponent: () =>
      import('./ledger/ledger.component')
        .then(m => m.LedgerComponent)
  }
];
```

### `src/app/features/iam/iam.routes.ts`
```typescript
import { Routes } from '@angular/router';

export const iamRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./user-list/user-list.component')
        .then(m => m.UserListComponent)
  }
];
```

---

## Step 10 — Placeholder Components

Create these as minimal standalone components for now. We'll fill them in one by one.

### `src/app/features/inventory/product-list/product-list.component.ts`
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventoryService } from '../../../core/services/inventory.service';
import { Product } from '../../../shared/models/inventory.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatTableModule, MatButtonModule,
    MatIconModule, MatCardModule, MatChipsModule, MatProgressSpinnerModule
  ],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit {

  products: Product[] = [];
  loading = true;
  displayedColumns = ['sku','name','category','price','currentStock','availableStock','status','actions'];

  constructor(
    private inventoryService: InventoryService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    this.inventoryService.getProducts().subscribe({
      next: res => { this.products = res.data; this.loading = false; },
      error: ()  => { this.loading = false; }
    });
  }

  getStockStatus(p: Product): string {
    if (!p.active)              return 'Decommissioned';
    if (p.currentStock === 0)   return 'Depleted';
    if (p.currentStock <= p.reorderThreshold) return 'Low Stock';
    return 'Active';
  }

  getStatusClass(p: Product): string {
    if (!p.active)              return 'neutral';
    if (p.currentStock === 0)   return 'error';
    if (p.currentStock <= p.reorderThreshold) return 'warning';
    return 'success';
  }
}
```

### `src/app/features/inventory/product-list/product-list.component.html`
```html
<div class="page-container">

  <div class="page-header">
    <h2>Inventory</h2>
    @if (auth.hasRole('ADMIN', 'STORE_MANAGER')) {
      <button mat-raised-button color="primary">
        <mat-icon>add</mat-icon> Add Product
      </button>
    }
  </div>

  @if (loading) {
    <div class="loading-center">
      <mat-spinner diameter="48" />
    </div>
  } @else {
    <mat-card>
      <table mat-table [dataSource]="products">

        <ng-container matColumnDef="sku">
          <th mat-header-cell *matHeaderCellDef>SKU</th>
          <td mat-cell *matCellDef="let p">
            <strong>{{ p.sku }}</strong>
          </td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef>Name</th>
          <td mat-cell *matCellDef="let p">{{ p.name }}</td>
        </ng-container>

        <ng-container matColumnDef="category">
          <th mat-header-cell *matHeaderCellDef>Category</th>
          <td mat-cell *matCellDef="let p">{{ p.category }}</td>
        </ng-container>

        <ng-container matColumnDef="price">
          <th mat-header-cell *matHeaderCellDef>Price</th>
          <td mat-cell *matCellDef="let p">₹{{ p.price | number:'1.2-2' }}</td>
        </ng-container>

        <ng-container matColumnDef="currentStock">
          <th mat-header-cell *matHeaderCellDef>Stock</th>
          <td mat-cell *matCellDef="let p">{{ p.currentStock }}</td>
        </ng-container>

        <ng-container matColumnDef="availableStock">
          <th mat-header-cell *matHeaderCellDef>Available</th>
          <td mat-cell *matCellDef="let p">{{ p.availableStock }}</td>
        </ng-container>

        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let p">
            <span [class]="'badge ' + getStatusClass(p)">
              {{ getStockStatus(p) }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef>Actions</th>
          <td mat-cell *matCellDef="let p">
            <button mat-icon-button color="primary" [routerLink]="['/inventory', p.id]">
              <mat-icon>visibility</mat-icon>
            </button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
    </mat-card>
  }

</div>
```

### `src/app/features/inventory/product-list/product-list.component.scss`
```scss
.page-header {
  display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 20px;
  h2 { font-size: 24px; font-weight: 600; margin: 0; }
}
.loading-center {
  display: flex; justify-content: center;
  align-items: center; height: 300px;
}
```

---

## Step 11 — Remaining Placeholder Components

Create these minimal files. We'll build them out fully next.

### `src/app/features/inventory/product-detail/product-detail.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page-container"><h2>Product Detail — Coming Soon</h2></div>`
})
export class ProductDetailComponent {}
```

### `src/app/features/inventory/low-stock/low-stock.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-low-stock',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page-container"><h2>Low Stock Alerts — Coming Soon</h2></div>`
})
export class LowStockComponent {}
```

### `src/app/features/orders/order-list/order-list.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page-container"><h2>Orders — Coming Soon</h2></div>`
})
export class OrderListComponent {}
```

### `src/app/features/orders/order-detail/order-detail.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page-container"><h2>Order Detail — Coming Soon</h2></div>`
})
export class OrderDetailComponent {}
```

### `src/app/features/pos/terminal-select/terminal-select.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-terminal-select',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <h2>Select Terminal</h2>
      <div class="terminals-grid">
        <mat-card class="terminal-card" *ngFor="let t of terminals">
          <mat-card-content>
            <mat-icon class="terminal-icon">point_of_sale</mat-icon>
            <h3>{{ t.code }}</h3>
            <p>{{ t.store }}</p>
            <button mat-raised-button color="primary"
                    [routerLink]="['/pos/terminal', t.code]"
                    [queryParams]="{storeId: t.storeId}">
              Open Terminal
            </button>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .terminals-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-top: 16px; }
    .terminal-card mat-card-content { text-align: center; padding: 24px !important; }
    .terminal-icon { font-size: 48px; width: 48px; height: 48px; color: #3f51b5; }
    h3 { margin: 8px 0 4px; font-size: 18px; }
    p  { color: #666; margin-bottom: 16px; }
  `]
})
export class TerminalSelectComponent {
  terminals = [
    { code: 'STORE1-T1', store: 'Chennai Store', storeId: 'STORE-CHENNAI-001' },
    { code: 'STORE1-T2', store: 'Chennai Store', storeId: 'STORE-CHENNAI-001' }
  ];
}
```

### `src/app/features/pos/billing-screen/billing-screen.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-billing-screen',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page-container"><h2>POS Billing — Coming Soon</h2></div>`
})
export class BillingScreenComponent {}
```

### `src/app/features/pos/sales-history/sales-history.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sales-history',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page-container"><h2>Sales History — Coming Soon</h2></div>`
})
export class SalesHistoryComponent {}
```

### `src/app/features/finance/finance-dashboard/finance-dashboard.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page-container"><h2>Finance Dashboard — Coming Soon</h2></div>`
})
export class FinanceDashboardComponent {}
```

### `src/app/features/finance/journal-entries/journal-entries.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-journal-entries',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page-container"><h2>Journal Entries — Coming Soon</h2></div>`
})
export class JournalEntriesComponent {}
```

### `src/app/features/finance/ledger/ledger.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page-container"><h2>Ledger — Coming Soon</h2></div>`
})
export class LedgerComponent {}
```

### `src/app/features/iam/user-list/user-list.component.ts`
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="page-container"><h2>User Management — Coming Soon</h2></div>`
})
export class UserListComponent {}
```

---

## Step 12 — Run & Verify

```bash
ng serve
```

Go to `http://localhost:4200`

- Should redirect to `/login`
- Login with `admin@retailerp.com` / `admin123`
- Should redirect to `/inventory`
- Sidebar visible with all 5 nav items
- Inventory table loads products from backend

---

## What's Working After This Step

```
✅ Login page with form validation
✅ JWT auth — token stored in sessionStorage
✅ Auth interceptor — all requests get Bearer token
✅ Route guards — unauthenticated users → /login
✅ Role guard — FINANCE/IAM routes protected
✅ Shell layout — sidebar + header + content area
✅ Sidebar — role-based nav items
✅ Inventory list — fetches from backend
✅ All routes wired up (placeholders for other modules)
```

## What's Next (Build Order)

```
1. Product Detail page (view + stock update)
2. POS Billing Screen (most complex)
3. Order List & Detail
4. Finance Dashboard & Ledger
5. IAM User Management
```
