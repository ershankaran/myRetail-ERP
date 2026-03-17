package com.myretailerp.pos.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myretailerp.pos.entity.Sale;
import com.myretailerp.pos.kafka.event.SaleCompletedEvent;
import com.myretailerp.pos.kafka.event.SaleItemEvent;
import com.myretailerp.pos.kafka.event.SaleVoidedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class PosEventPublisher {

    private final KafkaTemplate<String, byte[]> kafkaTemplate;
    private final ObjectMapper objectMapper;

    private static final String SALE_COMPLETED = "pos.sale.completed";
    private static final String SALE_VOIDED    = "pos.sale.voided";

    public void publishSaleCompleted(Sale sale,
                                     String receiptNumber) {
        SaleCompletedEvent event = new SaleCompletedEvent(
                "POS_SALE_COMPLETED",
                sale.getId(),
                sale.getTerminalId(),
                sale.getStoreId(),
                sale.getCashierId(),
                sale.getCustomerId(),
                sale.getTotalAmount(),
                sale.getPaymentMethod(),
                sale.getItems().stream()
                        .map(item -> new SaleItemEvent(
                                item.getProductId(),
                                item.getSku(),
                                item.getProductName(),
                                item.getQuantity(),
                                item.getUnitPrice(),
                                item.getSubtotal()))
                        .toList(),
                receiptNumber,
                LocalDateTime.now()
        );
        send(SALE_COMPLETED, sale.getStoreId(), event);
    }

    public void publishSaleVoided(Sale sale, String reason) {
        SaleVoidedEvent event = new SaleVoidedEvent(
                "POS_SALE_VOIDED",
                sale.getId(),
                sale.getStoreId(),
                sale.getTerminalId(),
                sale.getCashierId(),
                reason,
                LocalDateTime.now()
        );
        send(SALE_VOIDED, sale.getStoreId(), event);
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
                            log.info("Published {} partition={} offset={}",
                                    topic,
                                    result.getRecordMetadata().partition(),
                                    result.getRecordMetadata().offset());
                        }
                    });
        } catch (Exception e) {
            log.error("Serialization error: {}", e.getMessage());
        }
    }
}
