package com.myretailerp.order.kafka.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderFinanceEvent(
        String eventType,
        UUID orderId,
        String customerId,
        BigDecimal totalAmount,
        List<OrderItemEvent> items,
        LocalDateTime confirmedAt,
        LocalDateTime timestamp
) {}
