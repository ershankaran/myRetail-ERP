package com.myretailerp.finance.entity;

public enum ReferenceType {
    ONLINE_ORDER,   // from order.finance.confirmed
    POS_SALE,       // from pos.sale.completed
    POS_VOID,       // from pos.sale.voided
    PAYROLL,        // future
    PURCHASE_ORDER  // future
}
