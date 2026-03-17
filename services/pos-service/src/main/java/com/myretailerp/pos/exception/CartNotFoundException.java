package com.myretailerp.pos.exception;

public class CartNotFoundException extends RuntimeException {
    public CartNotFoundException(String terminalId) {
        super("No active cart for terminal: " + terminalId);
    }
}
