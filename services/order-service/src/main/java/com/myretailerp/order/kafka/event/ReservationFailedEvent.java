package com.myretailerp.order.kafka.event;

import java.util.List;
import java.util.UUID;

public record ReservationFailedEvent(
        String eventType,
        UUID orderId,
        List<String> failedSkus,
        String reason
) {}
