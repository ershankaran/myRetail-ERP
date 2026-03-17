package com.myretailerp.order.kafka;

import com.myretailerp.order.entity.Order;
import com.myretailerp.order.kafka.event.OrderCreatedEvent;
import com.myretailerp.order.kafka.event.OrderItemEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrderEventPublisher {

    private final KafkaTemplate<String, byte[]> kafkaTemplate;
    private final ObjectMapper objectMapper;

    private static final String ORDER_CREATED   = "order.created";
    private static final String ORDER_CONFIRMED = "order.confirmed";
    private static final String ORDER_CANCELLED = "order.cancelled";
    private static final String ORDER_SHIPPED   = "order.shipped";
    private static final String ORDER_DELIVERED = "order.delivered";

    public void publishOrderCreated(Order order) {
        OrderCreatedEvent event = new OrderCreatedEvent(
                "ORDER_CREATED",
                order.getId(),
                order.getCustomerId(),
                order.getItems().stream()
                        .map(item -> new OrderItemEvent(
                                item.getProductId(),
                                item.getSku(),
                                item.getProductName(),
                                item.getQuantity(),
                                item.getUnitPrice()))
                        .toList(),
                LocalDateTime.now()
        );
        send(ORDER_CREATED, order.getId().toString(), event);
    }

    public void publishOrderConfirmed(Order order) {
        send(ORDER_CONFIRMED, order.getId().toString(),
                Map.of("eventType", "ORDER_CONFIRMED",
                        "orderId", order.getId().toString(),
                        "customerId", order.getCustomerId(),
                        "totalAmount", order.getTotalAmount(),
                        "timestamp", LocalDateTime.now().toString()));
    }

    public void publishOrderCancelled(Order order, String reason) {
        send(ORDER_CANCELLED, order.getId().toString(),
                Map.of("eventType", "ORDER_CANCELLED",
                        "orderId", order.getId().toString(),
                        "customerId", order.getCustomerId(),
                        "reason", reason,
                        "timestamp", LocalDateTime.now().toString()));
    }

    public void publishOrderShipped(Order order) {
        send(ORDER_SHIPPED, order.getId().toString(),
                Map.of("eventType", "ORDER_SHIPPED",
                        "orderId", order.getId().toString(),
                        "customerId", order.getCustomerId(),
                        "timestamp", LocalDateTime.now().toString()));
    }

    public void publishOrderDelivered(Order order) {
        send(ORDER_DELIVERED, order.getId().toString(),
                Map.of("eventType", "ORDER_DELIVERED",
                        "orderId", order.getId().toString(),
                        "customerId", order.getCustomerId(),
                        "timestamp", LocalDateTime.now().toString()));
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
                            log.info("Published {} to partition={} offset={}",
                                    topic,
                                    result.getRecordMetadata().partition(),
                                    result.getRecordMetadata().offset());
                        }
                    });
        } catch (Exception e) {
            log.error("Failed to serialize event: {}", e.getMessage());
        }
    }
}
