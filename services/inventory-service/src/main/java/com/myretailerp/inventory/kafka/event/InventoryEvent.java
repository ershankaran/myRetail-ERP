package com.myretailerp.inventory.kafka.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record InventoryEvent(
        String eventType,
        UUID productId,
        String sku,
        String productName,
        LocalDateTime timestamp
) {}
