package com.myretailerp.finance.kafka.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderFinanceEvent(
        String eventType,
        UUID orderId,
        String customerId,
        BigDecimal totalAmount,
        List<OrderItemFinanceEvent> items,
        LocalDateTime confirmedAt,
        LocalDateTime timestamp
) {}
