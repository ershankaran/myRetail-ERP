package com.myretailerp.inventory.entity;

public enum TransactionReason {
    SALE,           // sold at POS or via order
    RESTOCK,        // received from supplier
    ADJUSTMENT,     // manual correction
    RETURN,         // customer return
    DAMAGE,         // damaged goods writeoff
    TRANSFER,       // moved between warehouses
    INITIAL         // initial stock on product creation
}