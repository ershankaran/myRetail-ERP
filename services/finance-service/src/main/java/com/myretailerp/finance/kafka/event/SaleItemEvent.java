package com.myretailerp.finance.kafka.event;

import java.math.BigDecimal;
import java.util.UUID;

public record SaleItemEvent(
        UUID productId,
        String sku,
        String productName,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal subtotal
) {}
