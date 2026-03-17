package com.myretailerp.order.kafka;

import com.myretailerp.order.kafka.event.ReservationFailedEvent;
import com.myretailerp.order.kafka.event.StockReservedEvent;
import com.myretailerp.order.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryEventConsumer {

    private final OrderService orderService;
    private final ObjectMapper objectMapper;

    @KafkaListener(topics = "inventory.stock.reserved",
            groupId = "order-service")
    public void handleStockReserved(byte[] message) {
        try {
            StockReservedEvent event = objectMapper
                    .readValue(message, StockReservedEvent.class);
            log.info("Consuming inventory.stock.reserved " +
                    "for orderId: {}", event.orderId());
            orderService.confirmOrder(event.orderId());
        } catch (Exception e) {
            log.error("Failed to process inventory.stock.reserved: {}",
                    e.getMessage(), e);
        }
    }

    @KafkaListener(topics = "inventory.reservation.failed",
            groupId = "order-service")
    public void handleReservationFailed(byte[] message) {
        try {
            ReservationFailedEvent event = objectMapper
                    .readValue(message, ReservationFailedEvent.class);
            log.info("Consuming inventory.reservation.failed " +
                    "for orderId: {}", event.orderId());
            orderService.cancelOrder(event.orderId(), event.reason());
        } catch (Exception e) {
            log.error("Failed to process reservation.failed: {}",
                    e.getMessage(), e);
        }
    }
}
