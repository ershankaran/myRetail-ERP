package com.myretailerp.order.service;

import com.myretailerp.order.client.InventoryClient;
import com.myretailerp.order.dto.CreateOrderRequest;
import com.myretailerp.order.dto.OrderResponse;
import com.myretailerp.order.entity.Order;
import com.myretailerp.order.entity.OrderItem;
import com.myretailerp.order.entity.OrderStatus;
import com.myretailerp.order.exception.InvalidOrderStateException;
import com.myretailerp.order.exception.OrderNotFoundException;
import com.myretailerp.order.kafka.OrderEventPublisher;
import com.myretailerp.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {

    private final OrderRepository orderRepository;
    private final OrderEventPublisher eventPublisher;
    private final InventoryClient inventoryClient;

    // ─── CREATE ORDER ─────────────────────────────────────────────
    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request, String bearerToken) {
        String customerId = getCurrentUserEmail();

        List<OrderItem> items = request.items().stream()
                .map(itemReq -> {
                    BigDecimal validatedPrice =
                            inventoryClient.getAndValidatePrice(
                                    itemReq.productId(),
                                    itemReq.sku(),
                                    itemReq.unitPrice(),
                                    bearerToken);          // ← forward token

                    BigDecimal subtotal = validatedPrice
                            .multiply(BigDecimal.valueOf(
                                    itemReq.quantity()));

                    return OrderItem.builder()
                            .productId(itemReq.productId())
                            .sku(itemReq.sku())
                            .productName(itemReq.productName())
                            .quantity(itemReq.quantity())
                            .unitPrice(validatedPrice)
                            .subtotal(subtotal)
                            .build();
                })
                .toList();

        BigDecimal total = items.stream()
                .map(OrderItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Order order = Order.builder()
                .customerId(customerId)
                .status(OrderStatus.PENDING)
                .totalAmount(total)
                .build();

        items.forEach(item -> item.setOrder(order));
        order.getItems().addAll(items);

        orderRepository.save(order);
        eventPublisher.publishOrderCreated(order);

        log.info("Order created: {} total: {}", order.getId(), total);
        return OrderResponse.from(order);
    }

    // ─── CONFIRM ORDER (Saga step — called by Kafka consumer) ─────
    @Transactional
    public void confirmOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getStatus() != OrderStatus.PENDING) {
            log.warn("Cannot confirm order {} — status is {}",
                    orderId, order.getStatus());
            return;
        }

        order.setStatus(OrderStatus.CONFIRMED);
        order.setConfirmedAt(LocalDateTime.now());
        orderRepository.save(order);

        // Emit order.confirmed → triggers inventory.confirmReservation
        eventPublisher.publishOrderConfirmed(order);

        log.info("Order confirmed: {}", orderId);
    }

    // ─── CANCEL ORDER (Saga compensating transaction) ─────────────
    @Transactional
    public void cancelOrder(UUID orderId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getStatus() == OrderStatus.DELIVERED ||
                order.getStatus() == OrderStatus.SHIPPED) {
            throw new InvalidOrderStateException(
                    "Cannot cancel order in status: " +
                            order.getStatus());
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancellationReason(reason);
        orderRepository.save(order);

        // Emit order.cancelled → triggers inventory.releaseReservation
        eventPublisher.publishOrderCancelled(order, reason);

        log.info("Order cancelled: {} — reason: {}", orderId, reason);
    }

    // ─── SHIP ORDER ───────────────────────────────────────────────
    @Transactional
    public OrderResponse shipOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getStatus() != OrderStatus.CONFIRMED &&
                order.getStatus() != OrderStatus.PROCESSING) {
            throw new InvalidOrderStateException(
                    "Cannot ship order in status: " +
                            order.getStatus());
        }

        order.setStatus(OrderStatus.SHIPPED);
        order.setShippedAt(LocalDateTime.now());
        orderRepository.save(order);

        eventPublisher.publishOrderShipped(order);

        log.info("Order shipped: {}", orderId);
        return OrderResponse.from(order);
    }

    // ─── DELIVER ORDER ────────────────────────────────────────────
    @Transactional
    public OrderResponse deliverOrder(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        if (order.getStatus() != OrderStatus.SHIPPED) {
            throw new InvalidOrderStateException(
                    "Cannot deliver order in status: " +
                            order.getStatus());
        }

        order.setStatus(OrderStatus.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now());
        orderRepository.save(order);

        eventPublisher.publishOrderDelivered(order);

        log.info("Order delivered: {}", orderId);
        return OrderResponse.from(order);
    }

    // ─── QUERIES ──────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public OrderResponse getOrder(UUID orderId) {
        return OrderResponse.from(
                orderRepository.findById(orderId)
                        .orElseThrow(() ->
                                new OrderNotFoundException(orderId)));
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getMyOrders() {
        return orderRepository
                .findByCustomerIdOrderByCreatedAtDesc(
                        getCurrentUserEmail())
                .stream()
                .map(OrderResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> getOrdersByStatus(OrderStatus status) {
        return orderRepository.findByStatus(status)
                .stream()
                .map(OrderResponse::from)
                .toList();
    }

    private String getCurrentUserEmail() {
        return SecurityContextHolder.getContext()
                .getAuthentication().getName();
    }
}
