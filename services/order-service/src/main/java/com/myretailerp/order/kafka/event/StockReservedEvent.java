package com.myretailerp.order.kafka.event;

import java.util.UUID;

public record StockReservedEvent(
        String eventType,
        UUID orderId
) {}
