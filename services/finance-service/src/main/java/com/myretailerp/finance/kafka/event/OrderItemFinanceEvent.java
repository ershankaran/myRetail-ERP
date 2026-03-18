package com.myretailerp.finance.kafka.event;

import java.math.BigDecimal;
import java.util.UUID;

public record OrderItemFinanceEvent(
        UUID productId,
        String sku,
        String productName,
        Integer quantity,
        BigDecimal unitPrice
) {}
