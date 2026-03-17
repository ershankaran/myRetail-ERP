package com.myretailerp.pos.kafka.event;


import com.myretailerp.pos.entity.PaymentMethod;

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
        PaymentMethod paymentMethod,
        List<SaleItemEvent> items,
        String receiptNumber,
        LocalDateTime timestamp
) {}
