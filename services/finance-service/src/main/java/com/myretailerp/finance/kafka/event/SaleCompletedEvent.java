package com.myretailerp.finance.kafka.event;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record SaleCompletedEvent(
        String eventType,
        UUID saleId,
        String terminalId,
        String storeId,
        String cashierId,
        UUID customerId,
        BigDecimal totalAmount,
        String paymentMethod,   // CASH, CARD, UPI
        List<SaleItemEvent> items,
        String receiptNumber,
        LocalDateTime timestamp
) {}
