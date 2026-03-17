package com.myretailerp.order.kafka.event;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record OrderCreatedEvent(
        String eventType,
        UUID orderId,
        String customerId,
        List<OrderItemEvent> items,
        LocalDateTime timestamp
) {}
