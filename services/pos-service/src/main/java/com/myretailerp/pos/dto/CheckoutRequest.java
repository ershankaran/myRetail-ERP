package com.myretailerp.pos.dto;

import com.myretailerp.pos.entity.PaymentMethod;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CheckoutRequest(
        @NotNull(message = "Payment method is required")
        PaymentMethod paymentMethod,

        UUID customerId    // optional — guest checkout allowed
) {}
