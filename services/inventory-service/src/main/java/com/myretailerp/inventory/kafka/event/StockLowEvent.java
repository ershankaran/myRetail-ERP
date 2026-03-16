package com.myretailerp.inventory.kafka.event;


import java.time.LocalDateTime;
import java.util.UUID;

public record StockLowEvent(
        String eventType,
        UUID productId,
        String sku,
        String productName,
        Integer currentQuantity,
        Integer reorderThreshold,
        String warehouseLocation,
        String supplierName,
        LocalDateTime timestamp
) {}