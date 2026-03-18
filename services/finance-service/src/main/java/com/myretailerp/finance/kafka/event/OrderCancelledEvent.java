package com.myretailerp.finance.kafka.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record OrderCancelledEvent(
        String eventType,
        String orderId,         // ← String, not UUID (sent as toString())
        String customerId,
        String reason,          // ← "reason" not "cancellationReason"
        String timestamp
) {}
