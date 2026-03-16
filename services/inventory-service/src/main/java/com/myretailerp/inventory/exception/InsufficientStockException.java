package com.myretailerp.inventory.exception;

public class InsufficientStockException extends RuntimeException {
    public InsufficientStockException(String sku,
                                      int available,
                                      int requested) {
        super(String.format(
                "Insufficient stock for SKU %s: available=%d, requested=%d",
                sku, available, requested));
    }
}
