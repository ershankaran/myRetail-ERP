package com.myretailerp.inventory.dto;

import com.myretailerp.inventory.entity.Category;
import com.myretailerp.inventory.entity.Product;
import com.myretailerp.inventory.entity.StockLevel;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record ProductResponse(
        UUID id,
        String sku,
        String name,
        String description,
        Category category,
        BigDecimal price,
        Integer currentStock,
        Integer reservedStock,
        Integer availableStock,
        String supplierName,
        String warehouseLocation,
        Integer reorderThreshold,
        boolean active,
        LocalDateTime createdAt
) {
    // ─── Compact constructor ──────────────────────────────────────────
    // Runs automatically on every instantiation — validates the invariant
    public ProductResponse {
        if (currentStock != null && reservedStock != null
                && availableStock != null) {
            int expected = currentStock - reservedStock;
            if (expected != availableStock) {
                throw new IllegalArgumentException(String.format(
                        "Stock invariant violated for SKU: " +
                                "current(%d) - reserved(%d) = %d, but available=%d",
                        currentStock, reservedStock, expected, availableStock));
            }
        }
    }

    // ─── Factory method ───────────────────────────────────────────────
    public static ProductResponse from(Product product, StockLevel stock) {
        return new ProductResponse(
                product.getId(),
                product.getSku(),
                product.getName(),
                product.getDescription(),
                product.getCategory(),
                product.getPrice(),
                stock != null ? stock.getQuantity() : 0,
                stock != null ? stock.getReservedQuantity() : 0,
                stock != null ? stock.getAvailableQuantity() : 0,
                product.getSupplierName(),
                product.getWarehouseLocation(),
                product.getReorderThreshold(),
                product.isActive(),
                product.getCreatedAt()
        );
    }
}