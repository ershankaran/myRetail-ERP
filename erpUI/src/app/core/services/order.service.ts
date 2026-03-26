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
      `${this.base}/orders/${id}/cancel?reason=${encodeURIComponent(reason)}`,
      {},
    );
  }
  deliverOrder(id: string): Observable<ApiResponse<void>> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/orders/${id}/deliver`, {});
  }
}
