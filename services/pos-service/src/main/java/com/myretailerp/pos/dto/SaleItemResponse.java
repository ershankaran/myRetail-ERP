package com.myretailerp.pos.dto;

import com.myretailerp.pos.entity.SaleItem;

import java.math.BigDecimal;

import java.util.UUID;

public record SaleItemResponse(
        UUID productId,
        String sku,
        String productName,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal subtotal
) {
    public static SaleItemResponse from(SaleItem item) {
        return new SaleItemResponse(
                item.getProductId(),
                item.getSku(),
                item.getProductName(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getSubtotal()
        );
    }
}
