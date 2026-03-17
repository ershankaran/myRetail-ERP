package com.myretailerp.inventory.kafka;

import com.myretailerp.inventory.entity.Product;
import com.myretailerp.inventory.entity.StockLevel;
import com.myretailerp.inventory.kafka.event.InventoryEvent;
import com.myretailerp.inventory.kafka.event.OrderItemEvent;
import com.myretailerp.inventory.kafka.event.StockLowEvent;
import com.myretailerp.inventory.kafka.event.StockUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class InventoryEventPublisher {

    private final KafkaTemplate<String, byte[]> kafkaTemplate;
    private final ObjectMapper objectMapper;

    private static final String PRODUCT_CREATED        = "inventory.product.created";
    private static final String STOCK_UPDATED          = "inventory.stock.updated";
    private static final String STOCK_LOW              = "inventory.stock.low";
    private static final String STOCK_DEPLETED         = "inventory.stock.depleted";
    private static final String PRODUCT_DECOMMISSIONED = "inventory.product.decommissioned";

    private static final String STOCK_RESERVED          = "inventory.stock.reserved";
    private static final String RESERVATION_FAILED      = "inventory.reservation.failed";


    public void publishProductCreated(Product product) {
        send(PRODUCT_CREATED, product.getSku(), new InventoryEvent(
                "PRODUCT_CREATED", product.getId(),
                product.getSku(), product.getName(),
                LocalDateTime.now()));
    }

    public void publishStockUpdated(Product product,
                                    Integer previousQty,
                                    Integer newQty,
                                    String reason) {
        send(STOCK_UPDATED, product.getSku(), new StockUpdatedEvent(
                "STOCK_UPDATED", product.getId(),
                product.getSku(), product.getName(),
                previousQty, newQty, reason,
                LocalDateTime.now()));
    }

    public void publishStockLow(Product product, StockLevel stock) {
        send(STOCK_LOW, product.getSku(), new StockLowEvent(
                "STOCK_LOW", product.getId(),
                product.getSku(), product.getName(),
                stock.getQuantity(), product.getReorderThreshold(),
                product.getWarehouseLocation(),
                product.getSupplierName(),
                LocalDateTime.now()));
    }

    public void publishStockDepleted(Product product) {
        send(STOCK_DEPLETED, product.getSku(), new InventoryEvent(
                "STOCK_DEPLETED", product.getId(),
                product.getSku(), product.getName(),
                LocalDateTime.now()));
    }

    public void publishProductDecommissioned(Product product) {
        send(PRODUCT_DECOMMISSIONED, product.getSku(), new InventoryEvent(
                "PRODUCT_DECOMMISSIONED", product.getId(),
                product.getSku(), product.getName(),
                LocalDateTime.now()));
    }

    private void send(String topic, String key, Object payload) {
        try {
            byte[] bytes = objectMapper.writeValueAsBytes(payload);
            kafkaTemplate.send(topic, key, bytes)
                    .whenComplete((result, ex) -> {
                        if (ex != null) {
                            log.error("Failed to publish to {}: {}",
                                    topic, ex.getMessage());
                        } else {
                            log.info("Published to {} partition={} offset={}",
                                    topic,
                                    result.getRecordMetadata().partition(),
                                    result.getRecordMetadata().offset());
                        }
                    });
        } catch (Exception e) {
            log.error("Failed to serialize event for topic {}: {}",
                    topic, e.getMessage());
        }
    }

    public void publishStockReserved(UUID orderId,
                                     List<OrderItemEvent> items) {
        Map<String, Object> event = Map.of(
                "eventType", "STOCK_RESERVED",
                "orderId", orderId.toString(),
                "items", items,
                "timestamp", LocalDateTime.now().toString()
        );
        send(STOCK_RESERVED, orderId.toString(), event);
    }

    public void publishReservationFailed(UUID orderId,
                                         List<String> failedSkus) {
        Map<String, Object> event = Map.of(
                "eventType", "RESERVATION_FAILED",
                "orderId", orderId.toString(),
                "failedSkus", failedSkus,
                "reason", "Insufficient stock or product unavailable",
                "timestamp", LocalDateTime.now().toString()
        );
        send(RESERVATION_FAILED, orderId.toString(), event);
    }
}