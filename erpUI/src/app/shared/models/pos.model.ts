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
