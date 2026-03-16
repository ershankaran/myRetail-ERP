package com.myretailerp.inventory.dto;

import com.myretailerp.inventory.entity.StockTransaction;

import java.time.LocalDateTime;
import java.util.UUID;

public record StockTransactionResponse(
        UUID id,
        Integer quantityBefore,
        Integer quantityAfter,
        Integer quantityChange,
        String reason,
        String referenceId,
        String performedBy,
        LocalDateTime performedAt
) {
    public static StockTransactionResponse from(StockTransaction tx) {
        return new StockTransactionResponse(
                tx.getId(),
                tx.getQuantityBefore(),
                tx.getQuantityAfter(),
                tx.getQuantityChange(),
                tx.getReason().name(),
                tx.getReferenceId(),
                tx.getPerformedBy(),
                tx.getPerformedAt()
        );
    }
}
