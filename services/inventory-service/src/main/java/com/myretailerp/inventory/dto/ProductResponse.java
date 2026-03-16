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
        String supplierName,
        String warehouseLocation,
        Integer reorderThreshold,
        boolean active,
        LocalDateTime createdAt
) {
    public static ProductResponse from(Product product, StockLevel stock) {
        return new ProductResponse(
                product.getId(),
                product.getSku(),
                product.getName(),
                product.getDescription(),
                product.getCategory(),
                product.getPrice(),
                stock != null ? stock.getQuantity() : 0,
                product.getSupplierName(),
                product.getWarehouseLocation(),
                product.getReorderThreshold(),
                product.isActive(),
                product.getCreatedAt()
        );
    }
}
