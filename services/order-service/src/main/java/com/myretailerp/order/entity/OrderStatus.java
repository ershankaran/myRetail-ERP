package com.myretailerp.order.entity;

public enum OrderStatus {
    PENDING,      // created, awaiting stock reservation
    CONFIRMED,    // stock reserved successfully
    PROCESSING,   // payment confirmed, being packed
    SHIPPED,      // dispatched
    DELIVERED,    // received by customer
    CANCELLED     // failed or manually cancelled
}
