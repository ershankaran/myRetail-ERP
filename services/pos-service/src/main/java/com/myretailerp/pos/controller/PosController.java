package com.myretailerp.pos.controller;

import com.myretailerp.common.dto.ApiResponse;
import com.myretailerp.pos.dto.*;
import com.myretailerp.pos.service.CartService;
import com.myretailerp.pos.service.SaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/pos")
@RequiredArgsConstructor
public class PosController {

    private final CartService cartService;
    private final SaleService saleService;

    // ─── CART ENDPOINTS ───────────────────────────────────────────

    @GetMapping("/terminals/{terminalId}/cart")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER','CASHIER')")
    public ResponseEntity<ApiResponse<CartDto>> getCart(
            @PathVariable String terminalId,
            @RequestParam String storeId) {  // ← remove cashierId param

        String cashierId = SecurityContextHolder.getContext()
                .getAuthentication().getName();  // ← from JWT

        return ResponseEntity.ok(ApiResponse.success(
                "Cart retrieved",
                cartService.getOrCreateCart(
                        terminalId, storeId, cashierId)));
    }

    @PostMapping("/terminals/{terminalId}/cart/items")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER','CASHIER')")
    public ResponseEntity<ApiResponse<CartDto>> addItem(
            @PathVariable String terminalId,
            @Valid @RequestBody AddItemRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Item added to cart",
                cartService.addItem(terminalId, request)));
    }

    @DeleteMapping("/terminals/{terminalId}/cart/items/{sku}")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER','CASHIER')")
    public ResponseEntity<ApiResponse<CartDto>> removeItem(
            @PathVariable String terminalId,
            @PathVariable String sku) {
        return ResponseEntity.ok(ApiResponse.success(
                "Item removed from cart",
                cartService.removeItem(terminalId, sku)));
    }

    @DeleteMapping("/terminals/{terminalId}/cart")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER','CASHIER')")
    public ResponseEntity<ApiResponse<Void>> clearCart(
            @PathVariable String terminalId) {
        cartService.clearCart(terminalId);
        return ResponseEntity.ok(
                ApiResponse.success("Cart cleared", null));
    }

    // ─── CHECKOUT ─────────────────────────────────────────────────

    @PostMapping("/terminals/{terminalId}/checkout")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER','CASHIER')")
    public ResponseEntity<ApiResponse<SaleResponse>> checkout(
            @PathVariable String terminalId,
            @RequestParam String storeId,
            @Valid @RequestBody CheckoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Sale completed successfully",
                        saleService.checkout(
                                terminalId, storeId, request)));
    }

    // ─── SALE ENDPOINTS ───────────────────────────────────────────

    @GetMapping("/sales/{saleId}")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER','CASHIER')")
    public ResponseEntity<ApiResponse<SaleResponse>> getSale(
            @PathVariable UUID saleId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Sale retrieved",
                saleService.getSale(saleId)));
    }

    @GetMapping("/terminals/{terminalId}/sales")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public ResponseEntity<ApiResponse<List<SaleResponse>>>
    getSalesByTerminal(@PathVariable String terminalId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Sales retrieved",
                saleService.getSalesByTerminal(terminalId)));
    }

    @PatchMapping("/sales/{saleId}/void")
    @PreAuthorize("hasAnyRole('ADMIN','STORE_MANAGER')")
    public ResponseEntity<ApiResponse<SaleResponse>> voidSale(
            @PathVariable UUID saleId,
            @RequestParam String reason) {
        return ResponseEntity.ok(ApiResponse.success(
                "Sale voided",
                saleService.voidSale(saleId, reason)));
    }
}
