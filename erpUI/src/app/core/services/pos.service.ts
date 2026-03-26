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
      `${this.base}/terminals/${terminalId}/cart?storeId=${storeId}`,
    );
  }
  addItem(
    terminalId: string,
    item: {
      productId: string;
      sku: string;
      productName: string;
      quantity: number;
    },
  ): Observable<ApiResponse<Cart>> {
    return this.http.post<ApiResponse<Cart>>(
      `${this.base}/terminals/${terminalId}/cart/items`,
      item,
    );
  }
  removeItem(terminalId: string, sku: string): Observable<ApiResponse<Cart>> {
    return this.http.delete<ApiResponse<Cart>>(
      `${this.base}/terminals/${terminalId}/cart/items/${sku}`,
    );
  }
  clearCart(terminalId: string): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/terminals/${terminalId}/cart`);
  }
  checkout(
    terminalId: string,
    storeId: string,
    paymentMethod: PaymentMethod,
  ): Observable<ApiResponse<Sale>> {
    return this.http.post<ApiResponse<Sale>>(
      `${this.base}/terminals/${terminalId}/checkout?storeId=${storeId}`,
      { paymentMethod },
    );
  }
  getSalesByTerminal(terminalId: string): Observable<ApiResponse<Sale[]>> {
    return this.http.get<ApiResponse<Sale[]>>(`${this.base}/terminals/${terminalId}/sales`);
  }
  voidSale(saleId: string, reason: string): Observable<ApiResponse<Sale>> {
    return this.http.patch<ApiResponse<Sale>>(
      `${this.base}/sales/${saleId}/void?reason=${encodeURIComponent(reason)}`,
      {},
    );
  }
}
