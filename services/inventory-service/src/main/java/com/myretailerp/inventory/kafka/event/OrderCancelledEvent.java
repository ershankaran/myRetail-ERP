package com.myretailerp.inventory.kafka.event;

import java.util.UUID;

public record OrderCancelledEvent(
        UUID orderId,
        String reason
) {}
