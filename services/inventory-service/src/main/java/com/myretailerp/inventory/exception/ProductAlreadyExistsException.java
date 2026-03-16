package com.myretailerp.inventory.exception;

public class ProductAlreadyExistsException extends RuntimeException {
    public ProductAlreadyExistsException(String sku) {
        super("Product already exists with SKU: " + sku);
    }
}
