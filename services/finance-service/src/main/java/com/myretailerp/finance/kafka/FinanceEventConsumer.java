package com.myretailerp.finance.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myretailerp.finance.kafka.event.OrderCancelledEvent;
import com.myretailerp.finance.kafka.event.OrderFinanceEvent;
import com.myretailerp.finance.kafka.event.SaleCompletedEvent;
import com.myretailerp.finance.kafka.event.SaleVoidedEvent;
import com.myretailerp.finance.service.FinanceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class FinanceEventConsumer {

    private final ObjectMapper objectMapper;
    private final FinanceService financeService;

    @KafkaListener(
            topics = "order.finance.confirmed",
            groupId = "finance-service",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onOrderFinanceConfirmed(byte[] payload) {
        try {
            OrderFinanceEvent event = objectMapper.readValue(
                    payload, OrderFinanceEvent.class);
            log.info("Finance: consuming order.finance.confirmed " +
                    "orderId: {}", event.orderId());
            financeService.recordOnlineOrder(event);
        } catch (Exception e) {
            log.error("Failed to process order.finance.confirmed: {}",
                    e.getMessage());
            throw new RuntimeException(e);
        }
    }

    @KafkaListener(
            topics = "pos.sale.completed",
            groupId = "finance-service",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onPosSaleCompleted(byte[] payload) {
        try {
            SaleCompletedEvent event = objectMapper.readValue(
                    payload, SaleCompletedEvent.class);
            log.info("Finance: consuming pos.sale.completed " +
                    "saleId: {}", event.saleId());
            financeService.recordPosSale(event);
        } catch (Exception e) {
            log.error("Failed to process pos.sale.completed: {}",
                    e.getMessage());
            throw new RuntimeException(e);
        }
    }

    @KafkaListener(
            topics = "pos.sale.voided",
            groupId = "finance-service",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onPosSaleVoided(byte[] payload) {
        try {
            SaleVoidedEvent event = objectMapper.readValue(
                    payload, SaleVoidedEvent.class);
            log.info("Finance: consuming pos.sale.voided " +
                    "saleId: {}", event.saleId());
            financeService.recordPosVoid(event);
        } catch (Exception e) {
            log.error("Failed to process pos.sale.voided: {}",
                    e.getMessage());
            throw new RuntimeException(e);
        }
    }

    @KafkaListener(
            topics = "order.cancelled",
            groupId = "finance-service",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void onOrderCancelled(byte[] payload) {
        try {
            OrderCancelledEvent event = objectMapper.readValue(
                    payload, OrderCancelledEvent.class);
            log.info("Finance: consuming order.cancelled " +
                    "orderId: {}", event.orderId());
            financeService.reverseOnlineOrder(event);
        } catch (Exception e) {
            log.error("Failed to process order.cancelled: {}",
                    e.getMessage());
            throw new RuntimeException(e);
        }
    }
}
