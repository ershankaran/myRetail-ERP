package com.myretailerp.pos.entity;

public enum SaleStatus {
    COMPLETED,      // normal successful sale
    VOIDED,         // cancelled after completion
    PENDING_SYNC    // offline mode — not yet synced
}
