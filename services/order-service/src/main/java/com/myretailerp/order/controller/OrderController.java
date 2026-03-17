package com.myretailerp.order.controller;


import com.myretailerp.common.dto.ApiResponse;
import com.myretailerp.order.dto.CreateOrderRequest;
import com.myretailerp.order.dto.OrderResponse;
import com.myretailerp.order.entity.OrderStatus;
import com.myretailerp.order.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER','CASHIER')")
    public ResponseEntity<ApiResponse<OrderResponse>> createOrder(
            @Valid @RequestBody CreateOrderRequest request, @RequestHeader("Authorization") String bearerToken) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Order created successfully",
                        orderService.createOrder(request,bearerToken)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<OrderResponse>>
    getOrder(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Order retrieved",
                orderService.getOrder(id)));
    }

    @GetMapping("/my-orders")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<OrderResponse>>>
    getMyOrders() {
        return ResponseEntity.ok(ApiResponse.success(
                "Orders retrieved",
                orderService.getMyOrders()));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public ResponseEntity<ApiResponse<List<OrderResponse>>>
    getByStatus(@PathVariable OrderStatus status) {
        return ResponseEntity.ok(ApiResponse.success(
                "Orders retrieved",
                orderService.getOrdersByStatus(status)));
    }

    @PatchMapping("/{id}/ship")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public ResponseEntity<ApiResponse<OrderResponse>>
    shipOrder(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Order shipped",
                orderService.shipOrder(id)));
    }

    @PatchMapping("/{id}/deliver")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public ResponseEntity<ApiResponse<OrderResponse>>
    deliverOrder(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Order delivered",
                orderService.deliverOrder(id)));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public ResponseEntity<ApiResponse<Void>>
    cancelOrder(@PathVariable UUID id,
                @RequestParam String reason) {
        orderService.cancelOrder(id, reason);
        return ResponseEntity.ok(ApiResponse.success(
                "Order cancelled", null));
    }
}
