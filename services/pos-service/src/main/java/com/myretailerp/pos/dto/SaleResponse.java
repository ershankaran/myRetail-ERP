package com.myretailerp.pos.dto;

import com.myretailerp.pos.entity.PaymentMethod;
import com.myretailerp.pos.entity.Sale;
import com.myretailerp.pos.entity.SaleStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record SaleResponse(
        UUID saleId,
        String terminalId,
        String storeId,
        String cashierId,
        UUID customerId,
        BigDecimal totalAmount,
        PaymentMethod paymentMethod,
        SaleStatus status,
        List<SaleItemResponse> items,
        String receiptNumber,
        LocalDateTime createdAt
) {
    public static SaleResponse from(Sale sale, String receiptNumber) {
        return new SaleResponse(
                sale.getId(),
                sale.getTerminalId(),
                sale.getStoreId(),
                sale.getCashierId(),
                sale.getCustomerId(),
                sale.getTotalAmount(),
                sale.getPaymentMethod(),
                sale.getStatus(),
                sale.getItems().stream()
                        .map(SaleItemResponse::from)
                        .toList(),
                receiptNumber,
                sale.getCreatedAt()
        );
    }
}
