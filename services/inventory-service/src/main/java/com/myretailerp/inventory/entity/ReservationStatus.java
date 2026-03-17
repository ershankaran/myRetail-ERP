package com.myretailerp.inventory.entity;

public enum ReservationStatus {
    RESERVED,    // stock held, order pending
    CONFIRMED,   // order confirmed — stock physically deducted
    RELEASED     // order cancelled — stock returned to available
}
