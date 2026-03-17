package com.myretailerp.pos.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public record CartDto(
        String cartId,
        String terminalId,
        String storeId,
        String cashierId,
        List<CartItemDto> items,
        BigDecimal totalAmount,
        LocalDateTime createdAt,
        LocalDateTime expiresAt
) implements Serializable {

    // Compact constructor — validate invariants
    public CartDto {
        if (items == null) items = new ArrayList<>();
    }
}
