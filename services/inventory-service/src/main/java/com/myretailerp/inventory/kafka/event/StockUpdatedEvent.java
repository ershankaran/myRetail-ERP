package com.myretailerp.inventory.kafka.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record StockUpdatedEvent(
        String eventType,
        UUID productId,
        String sku,
        String productName,
        Integer previousQuantity,
        Integer newQuantity,
        String changeReason,
        LocalDateTime timestamp
) {}
