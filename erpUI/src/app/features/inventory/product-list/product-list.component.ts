import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InventoryService } from '../../../core/services/inventory.service';
import { AuthService } from '../../../core/services/auth.service';
import { Product } from '../../../shared/models/inventory.model';

@Component({
  selector: 'app-product-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    DecimalPipe,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h2>Inventory</h2>
        @if (auth.hasRole('ADMIN', 'STORE_MANAGER')) {
          <button mat-raised-button color="primary"><mat-icon>add</mat-icon> Add Product</button>
        }
      </div>

      @if (loading) {
        <div class="center">
          <mat-spinner diameter="48"></mat-spinner>
        </div>
      }

      @if (!loading) {
        <mat-card>
          <mat-card-content>
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
                <td mat-cell *matCellDef="let p">₹{{ p.price | number: '1.2-2' }}</td>
              </ng-container>

              <ng-container matColumnDef="stock">
                <th mat-header-cell *matHeaderCellDef>Stock</th>
                <td mat-cell *matCellDef="let p">{{ p.currentStock }}</td>
              </ng-container>

              <ng-container matColumnDef="available">
                <th mat-header-cell *matHeaderCellDef>Available</th>
                <td mat-cell *matCellDef="let p">{{ p.availableStock }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let p">
                  <span [class]="'badge ' + statusClass(p)">
                    {{ statusLabel(p) }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let p">
                  <button mat-icon-button color="primary" [routerLink]="['/inventory', p.id]">
                    <mat-icon>visibility</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let r; columns: cols"></tr>
            </table>

            @if (products.length === 0) {
              <div class="empty">
                <mat-icon>inventory_2</mat-icon>
                <p>No products found</p>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 20px;
      }
      .page-header h2 {
        font-size: 24px;
        font-weight: 600;
        margin: 0;
      }
      .center {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 300px;
      }
      table {
        width: 100%;
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px;
        color: #999;
      }
      .empty mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
      }
    `,
  ],
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  loading = true;
  cols = ['sku', 'name', 'category', 'price', 'stock', 'available', 'status', 'actions'];

  constructor(
    private inv: InventoryService,
    public auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.inv.getProducts().subscribe({
      next: (res) => {
        this.products = res.data;
        this.loading = false;
        this.cdr.detectChanges(); // ← force Angular to re-evaluate @if
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  statusLabel(p: Product): string {
    if (!p.active) return 'Decommissioned';
    if (p.currentStock === 0) return 'Depleted';
    if (p.currentStock <= p.reorderThreshold) return 'Low Stock';
    return 'Active';
  }

  statusClass(p: Product): string {
    if (!p.active) return 'neutral';
    if (p.currentStock === 0) return 'error';
    if (p.currentStock <= p.reorderThreshold) return 'warning';
    return 'success';
  }
}
