import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { PosService } from '../../../core/services/pos.service';
import { InventoryService } from '../../../core/services/inventory.service';
import { AuthService } from '../../../core/services/auth.service';
import { Cart, CartItem, PaymentMethod, Sale } from '../../../shared/models/pos.model';
import { Product } from '../../../shared/models/inventory.model';
import { ReceiptDialogComponent } from '../receipt-dialog/receipt-dialog.component';

@Component({
  selector: 'app-billing-screen',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTableModule,
  ],
  template: `
    <div class="billing-wrapper">
      <!-- Top Bar -->
      <div class="billing-topbar">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="topbar-info">
          <span class="terminal-name">{{ terminalId }}</span>
          <span class="store-name">{{ storeId }}</span>
        </div>
        <div class="spacer"></div>
        <span class="cashier-info">
          <mat-icon>person</mat-icon>
          {{ auth.user()?.email }}
        </span>
        <button mat-stroked-button (click)="viewSalesHistory()" class="history-btn">
          <mat-icon>history</mat-icon> Sales History
        </button>
      </div>

      <!-- Main Billing Area -->
      <div class="billing-main">
        <!-- LEFT — Product Search -->
        <div class="search-panel">
          <mat-card class="search-card">
            <mat-card-content>
              <h3 class="panel-title"><mat-icon>search</mat-icon> Find Product</h3>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Search by name or SKU</mat-label>
                <input
                  matInput
                  [formControl]="searchCtrl"
                  (keyup.enter)="searchProducts()"
                  placeholder="e.g. Wireless Mouse or ELEC-MOUSE-001"
                />
                <mat-icon matSuffix>search</mat-icon>
              </mat-form-field>

              <div class="qty-row">
                <mat-form-field appearance="outline" class="qty-field">
                  <mat-label>Quantity</mat-label>
                  <input matInput type="number" [(ngModel)]="qty" min="1" [max]="9999" />
                </mat-form-field>
                <button
                  mat-raised-button
                  color="primary"
                  class="search-btn"
                  (click)="searchProducts()"
                  [disabled]="searching"
                >
                  @if (searching) {
                    <mat-spinner diameter="20"></mat-spinner>
                  } @else {
                    Search
                  }
                </button>
              </div>

              <!-- Search Results -->
              @if (searchResults.length > 0) {
                <div class="results-list">
                  @for (p of searchResults; track p.id) {
                    <div class="result-item" (click)="addToCart(p)">
                      <div class="result-info">
                        <div class="result-name">{{ p.name }}</div>
                        <div class="result-sku">{{ p.sku }}</div>
                      </div>
                      <div class="result-right">
                        <div class="result-price">₹{{ p.price | number: '1.2-2' }}</div>
                        <div class="result-stock" [class.low]="p.availableStock < 10">
                          Stock: {{ p.availableStock }}
                        </div>
                      </div>
                      <mat-icon class="add-icon">add_circle</mat-icon>
                    </div>
                  }
                </div>
              }

              @if (searchError) {
                <div class="search-error"><mat-icon>error_outline</mat-icon> {{ searchError }}</div>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <!-- RIGHT — Cart -->
        <div class="cart-panel">
          <mat-card class="cart-card">
            <mat-card-content>
              <div class="cart-header">
                <h3 class="panel-title">
                  <mat-icon>shopping_cart</mat-icon>
                  Cart
                  @if (cart && cart.items.length > 0) {
                    <span class="cart-count">{{ cart.items.length }}</span>
                  }
                </h3>
                @if (cart && cart.items.length > 0) {
                  <button
                    mat-icon-button
                    color="warn"
                    (click)="clearCart()"
                    matTooltip="Clear cart"
                  >
                    <mat-icon>delete_sweep</mat-icon>
                  </button>
                }
              </div>

              @if (cartLoading) {
                <div class="cart-loading">
                  <mat-spinner diameter="32"></mat-spinner>
                </div>
              }

              @if (!cartLoading) {
                <!-- Cart Items -->
                @if (cart && cart.items.length > 0) {
                  <div class="cart-items">
                    @for (item of cart.items; track item.sku) {
                      <div class="cart-item">
                        <div class="item-info">
                          <div class="item-name">{{ item.productName }}</div>
                          <div class="item-sku">{{ item.sku }}</div>
                        </div>
                        <div class="item-qty">
                          <span class="qty-badge">× {{ item.quantity }}</span>
                        </div>
                        <div class="item-price">₹{{ item.subtotal | number: '1.2-2' }}</div>
                        <button mat-icon-button color="warn" (click)="removeItem(item.sku)">
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                    }
                  </div>

                  <mat-divider class="cart-divider"></mat-divider>

                  <!-- Total -->
                  <div class="cart-total">
                    <span class="total-label">Total</span>
                    <span class="total-amount"> ₹{{ cart.totalAmount | number: '1.2-2' }} </span>
                  </div>

                  <!-- Payment Method -->
                  <div class="payment-section">
                    <div class="payment-label">Payment Method</div>
                    <div class="payment-buttons">
                      <button
                        [class.selected]="paymentMethod === 'CASH'"
                        (click)="paymentMethod = 'CASH'"
                        class="pay-btn"
                      >
                        <mat-icon>payments</mat-icon> Cash
                      </button>
                      <button
                        [class.selected]="paymentMethod === 'CARD'"
                        (click)="paymentMethod = 'CARD'"
                        class="pay-btn"
                      >
                        <mat-icon>credit_card</mat-icon> Card
                      </button>
                      <button
                        [class.selected]="paymentMethod === 'UPI'"
                        (click)="paymentMethod = 'UPI'"
                        class="pay-btn"
                      >
                        <mat-icon>qr_code</mat-icon> UPI
                      </button>
                    </div>
                  </div>

                  <!-- Checkout Button -->
                  <button
                    mat-raised-button
                    color="primary"
                    class="checkout-btn"
                    [disabled]="checkingOut"
                    (click)="checkout()"
                  >
                    @if (checkingOut) {
                      <mat-spinner diameter="24"></mat-spinner>
                    } @else {
                      <mat-icon>done</mat-icon>
                      Checkout — ₹{{ cart.totalAmount | number: '1.2-2' }}
                    }
                  </button>
                } @else {
                  <!-- Empty Cart -->
                  <div class="empty-cart">
                    <mat-icon>shopping_cart</mat-icon>
                    <p>Cart is empty</p>
                    <span>Search and add products to begin billing</span>
                  </div>
                }
              }
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .billing-wrapper {
        display: flex;
        flex-direction: column;
        height: 100vh;
        background: #f5f7fa;
        overflow: hidden;
      }

      /* Top Bar */
      .billing-topbar {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #1e2a3a;
        color: #fff;
        padding: 10px 20px;
        flex-shrink: 0;
      }
      .topbar-info {
        display: flex;
        flex-direction: column;
      }
      .terminal-name {
        font-size: 16px;
        font-weight: 700;
      }
      .store-name {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }
      .spacer {
        flex: 1;
      }
      .cashier-info {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
      .history-btn {
        color: #fff !important;
        border-color: rgba(255, 255, 255, 0.3) !important;
        font-size: 13px;
      }

      /* Main billing layout */
      .billing-main {
        display: grid;
        grid-template-columns: 1fr 1.2fr;
        gap: 16px;
        flex: 1;
        padding: 16px;
        overflow: hidden;
      }

      .search-panel,
      .cart-panel {
        overflow-y: auto;
      }

      .search-card,
      .cart-card {
        border-radius: 12px !important;
        height: 100%;
      }
      .search-card mat-card-content,
      .cart-card mat-card-content {
        padding: 20px !important;
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .panel-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 16px;
        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
          color: #3f51b5;
        }
      }

      .cart-count {
        background: #3f51b5;
        color: #fff;
        border-radius: 10px;
        padding: 2px 8px;
        font-size: 12px;
        font-weight: 700;
        margin-left: 4px;
      }

      /* Search form */
      .full-width {
        width: 100%;
      }
      .qty-row {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      .qty-field {
        width: 100px;
        flex-shrink: 0;
      }
      .search-btn {
        height: 56px;
        flex: 1;
      }

      /* Search results */
      .results-list {
        flex: 1;
        overflow-y: auto;
      }
      .result-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        cursor: pointer;
        border: 1px solid #f0f0f0;
        margin-bottom: 8px;
        transition: all 0.15s;
      }
      .result-item:hover {
        background: #e8eaf6;
        border-color: #3f51b5;
        .add-icon {
          color: #3f51b5;
        }
      }
      .result-info {
        flex: 1;
      }
      .result-name {
        font-size: 14px;
        font-weight: 500;
      }
      .result-sku {
        font-size: 12px;
        color: #888;
      }
      .result-right {
        text-align: right;
      }
      .result-price {
        font-size: 15px;
        font-weight: 700;
        color: #1565c0;
      }
      .result-stock {
        font-size: 11px;
        color: #666;
      }
      .result-stock.low {
        color: #c62828;
      }
      .add-icon {
        color: #bbb;
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .search-error {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #c62828;
        background: #ffebee;
        padding: 10px;
        border-radius: 8px;
        font-size: 14px;
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }

      /* Cart */
      .cart-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
      }
      .cart-loading {
        display: flex;
        justify-content: center;
        padding: 32px;
      }

      .cart-items {
        flex: 1;
        overflow-y: auto;
        margin-bottom: 12px;
      }
      .cart-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 0;
        border-bottom: 1px solid #f5f5f5;
      }
      .item-info {
        flex: 1;
      }
      .item-name {
        font-size: 14px;
        font-weight: 500;
      }
      .item-sku {
        font-size: 12px;
        color: #888;
      }
      .qty-badge {
        background: #e8eaf6;
        color: #3f51b5;
        padding: 2px 8px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
      }
      .item-price {
        font-size: 14px;
        font-weight: 600;
        white-space: nowrap;
      }

      .cart-divider {
        margin: 12px 0;
      }
      .cart-total {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        margin-bottom: 16px;
      }
      .total-label {
        font-size: 16px;
        font-weight: 600;
      }
      .total-amount {
        font-size: 28px;
        font-weight: 700;
        color: #1565c0;
      }

      /* Payment */
      .payment-section {
        margin-bottom: 16px;
      }
      .payment-label {
        font-size: 13px;
        color: #888;
        margin-bottom: 8px;
      }
      .payment-buttons {
        display: flex;
        gap: 8px;
      }
      .pay-btn {
        flex: 1;
        padding: 10px 0;
        border-radius: 8px;
        border: 2px solid #e0e0e0;
        background: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 500;
        color: #555;
        transition: all 0.15s;
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
      .pay-btn:hover {
        border-color: #3f51b5;
        color: #3f51b5;
      }
      .pay-btn.selected {
        border-color: #3f51b5;
        background: #e8eaf6;
        color: #3f51b5;
        font-weight: 700;
      }

      /* Checkout */
      .checkout-btn {
        width: 100%;
        height: 52px;
        font-size: 16px;
        font-weight: 700;
        border-radius: 10px !important;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      /* Empty cart */
      .empty-cart {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #bbb;
        padding: 48px;
        mat-icon {
          font-size: 64px;
          width: 64px;
          height: 64px;
          margin-bottom: 12px;
        }
        p {
          font-size: 18px;
          font-weight: 500;
          margin: 0 0 8px;
        }
        span {
          font-size: 14px;
        }
      }
    `,
  ],
})
export class BillingScreenComponent implements OnInit {
  terminalId = '';
  storeId = '';
  cart: Cart | null = null;
  cartLoading = true;
  searching = false;
  checkingOut = false;
  searchResults: Product[] = [];
  searchError = '';
  paymentMethod: PaymentMethod = 'CASH';
  qty = 1;
  searchCtrl = new FormControl('');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private posService: PosService,
    private inventoryService: InventoryService,
    public auth: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.terminalId = this.route.snapshot.paramMap.get('terminalId')!;
    this.storeId = this.route.snapshot.queryParamMap.get('storeId') ?? 'STORE-CHENNAI-001';
    this.loadCart();
  }

  loadCart(): void {
    this.cartLoading = true;
    this.posService.getCart(this.terminalId, this.storeId).subscribe({
      next: (res) => {
        this.cart = res.data;
        this.cartLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.cartLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  searchProducts(): void {
    const query = this.searchCtrl.value?.trim();
    if (!query) return;

    this.searching = true;
    this.searchError = '';
    this.searchResults = [];

    // Try SKU first, then name search from all products
    this.inventoryService.getProductBySku(query).subscribe({
      next: (res) => {
        this.searchResults = [res.data];
        this.searching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        // SKU not found — search by name from all products
        this.inventoryService.getProducts().subscribe({
          next: (res) => {
            const q = query.toLowerCase();
            this.searchResults = res.data.filter(
              (p) =>
                p.active && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
            );
            if (this.searchResults.length === 0) {
              this.searchError = `No product found for "${query}"`;
            }
            this.searching = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.searchError = 'Failed to search products';
            this.searching = false;
            this.cdr.detectChanges();
          },
        });
      },
    });
  }

  addToCart(product: Product): void {
    if (product.availableStock < this.qty) {
      this.snackBar.open(`Only ${product.availableStock} units available`, 'Close', {
        duration: 3000,
      });
      return;
    }

    this.posService
      .addItem(this.terminalId, {
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        quantity: this.qty,
      })
      .subscribe({
        next: (res) => {
          this.cart = res.data;
          this.searchResults = [];
          this.searchCtrl.reset();
          this.qty = 1;
          this.cdr.detectChanges();
          this.snackBar.open(`${product.name} added to cart`, 'Close', { duration: 2000 });
        },
        error: (err) => {
          this.snackBar.open(err.error?.message || 'Failed to add item', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  removeItem(sku: string): void {
    this.posService.removeItem(this.terminalId, sku).subscribe({
      next: (res) => {
        this.cart = res.data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.snackBar.open(err.error?.message || 'Failed to remove item', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  clearCart(): void {
    this.posService.clearCart(this.terminalId).subscribe({
      next: () => {
        this.loadCart();
        this.snackBar.open('Cart cleared', 'Close', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Failed to clear cart', 'Close', { duration: 3000 });
      },
    });
  }

  checkout(): void {
    if (!this.cart || this.cart.items.length === 0) return;
    this.checkingOut = true;

    this.posService.checkout(this.terminalId, this.storeId, this.paymentMethod).subscribe({
      next: (res) => {
        this.checkingOut = false;
        const sale = res.data;

        // Show receipt dialog
        this.dialog
          .open(ReceiptDialogComponent, {
            width: '480px',
            data: { sale },
            disableClose: true,
          })
          .afterClosed()
          .subscribe(() => {
            // Reload empty cart after receipt dismissed
            this.loadCart();
            this.paymentMethod = 'CASH';
          });

        this.cdr.detectChanges();
      },
      error: (err) => {
        this.checkingOut = false;
        this.snackBar.open(err.error?.message || 'Checkout failed', 'Close', { duration: 4000 });
        this.cdr.detectChanges();
      },
    });
  }

  viewSalesHistory(): void {
    this.router.navigate(['/pos/terminal', this.terminalId, 'sales'], {
      queryParams: { storeId: this.storeId },
    });
  }

  goBack(): void {
    this.router.navigate(['/pos']);
  }
}
