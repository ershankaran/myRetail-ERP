package com.myretailerp.inventory.dto;

import com.myretailerp.inventory.entity.Category;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;


public record CreateProductRequest(

        @NotBlank(message = "SKU is required")
        @Pattern(regexp = "^[A-Z]{2,6}-[A-Z0-9-]+$",
                message = "SKU format: 'ELEC-MOUSE-001'")
        String sku,

        @NotBlank(message = "Product name is required")
        String name,

        String description,

        @NotNull(message = "Category is required")
        Category category,

        @NotNull(message = "Price is required")
        @DecimalMin(value = "0.01", message = "Price must be greater than 0")
        BigDecimal price,

        @NotNull(message = "Initial stock quantity is required")
        @Min(value = 0, message = "Quantity cannot be negative")
        Integer initialQuantity,

        @NotBlank(message = "Supplier name is required")
        String supplierName,

        @NotBlank(message = "Warehouse location is required")
        String warehouseLocation,

        @NotNull(message = "Reorder threshold is required")
        @Min(value = 1, message = "Reorder threshold must be at least 1")
        Integer reorderThreshold

) {}
