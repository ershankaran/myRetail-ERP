package com.myretailerp.inventory.kafka.event;

import java.util.UUID;

public record OrderItemEvent(
        UUID productId,
        String sku,
        Integer quantity
) {}
