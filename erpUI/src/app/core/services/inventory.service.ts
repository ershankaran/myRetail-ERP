import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import {
  Product,
  CreateProductRequest,
  UpdateStockRequest,
  StockTransaction,
} from '../../shared/models/inventory.model';

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
    return this.http.get<ApiResponse<StockTransaction[]>>(
      `${this.base}/products/${id}/transactions`,
    );
  }
}
