package com.myretailerp.inventory.kafka.event;

import java.util.List;
import java.util.UUID;

public record OrderCreatedEvent(
        UUID orderId,
        String customerId,
        List<OrderItemEvent> items
) {}
