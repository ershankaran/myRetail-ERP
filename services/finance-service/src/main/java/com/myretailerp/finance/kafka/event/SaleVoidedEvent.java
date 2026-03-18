package com.myretailerp.finance.kafka.event;

import java.time.LocalDateTime;
import java.util.UUID;

public record SaleVoidedEvent(
        String eventType,
        UUID saleId,
        String storeId,
        String terminalId,
        String cashierId,
        String reason,
        LocalDateTime timestamp
) {}
