package com.myretailerp.order.kafka.event;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemEvent(
        UUID productId,
        String sku,
        String productName,
        Integer quantity,
        BigDecimal unitPrice
) {}
