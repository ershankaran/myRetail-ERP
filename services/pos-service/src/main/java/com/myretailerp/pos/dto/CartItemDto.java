package com.myretailerp.pos.dto;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.UUID;

public record CartItemDto(
        UUID productId,
        String sku,
        String productName,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal subtotal
) implements Serializable {}