export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

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
