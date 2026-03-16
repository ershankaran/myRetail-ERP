package com.myretailerp.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateStockRequest(

        @NotNull(message = "Quantity change is required")
        Integer quantityChange,

        @NotBlank(message = "Change reason is required")
        String reason,

        String referenceId

) {}
