package com.myretailerp.pos.exception;


public class CartEmptyException extends RuntimeException {
    public CartEmptyException(String terminalId) {
        super("Cart is empty for terminal: " + terminalId);
    }
}
