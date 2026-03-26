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
