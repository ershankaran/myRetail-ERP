package com.myretailerp.inventory.kafka;


import com.myretailerp.inventory.kafka.event.OrderCancelledEvent;
import com.myretailerp.inventory.kafka.event.OrderConfirmedEvent;
import com.myretailerp.inventory.kafka.event.OrderCreatedEvent;
import com.myretailerp.inventory.service.InventoryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryOrderEventConsumer {

    private final InventoryService inventoryService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "order.created",
            groupId = "inventory-service")
    public void handleOrderCreated(byte[] message) {
        try {
            OrderCreatedEvent event = objectMapper
                    .readValue(message, OrderCreatedEvent.class);
            log.info("Consuming order.created for orderId: {}",
                    event.orderId());
            inventoryService.reserveStock(event);
        } catch (Exception e) {
            log.error("Failed to process order.created: {}",
                    e.getMessage(), e);
        }
    }

    @KafkaListener(topics = "order.confirmed",
            groupId = "inventory-service")
    public void handleOrderConfirmed(byte[] message) {
        try {
            OrderConfirmedEvent event = objectMapper
                    .readValue(message, OrderConfirmedEvent.class);
            log.info("Consuming order.confirmed for orderId: {}",
                    event.orderId());
            inventoryService.confirmReservation(event.orderId());
        } catch (Exception e) {
            log.error("Failed to process order.confirmed: {}",
                    e.getMessage(), e);
        }
    }

    @KafkaListener(topics = "order.cancelled",
            groupId = "inventory-service")
    public void handleOrderCancelled(byte[] message) {
        try {
            OrderCancelledEvent event = objectMapper
                    .readValue(message, OrderCancelledEvent.class);
            log.info("Consuming order.cancelled for orderId: {}",
                    event.orderId());
            inventoryService.releaseReservation(event.orderId());
        } catch (Exception e) {
            log.error("Failed to process order.cancelled: {}",
                    e.getMessage(), e);
        }
    }
}
