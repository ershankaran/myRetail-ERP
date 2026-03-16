package com.myretailerp.inventory.controller;

import com.myretailerp.common.dto.ApiResponse;
import com.myretailerp.inventory.dto.CreateProductRequest;
import com.myretailerp.inventory.dto.ProductResponse;
import com.myretailerp.inventory.dto.StockTransactionResponse;
import com.myretailerp.inventory.dto.UpdateStockRequest;
import com.myretailerp.inventory.entity.Category;
import com.myretailerp.inventory.service.InventoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping("/products")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<ProductResponse>> createProduct(
            @Valid @RequestBody CreateProductRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Product created successfully",
                        inventoryService.createProduct(request)));
    }

    @GetMapping("/products")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ProductResponse>>>
    getAllProducts() {
        return ResponseEntity.ok(ApiResponse.success(
                "Products retrieved",
                inventoryService.getAllActiveProducts()));
    }

    @GetMapping("/products/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ProductResponse>>
    getProduct(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Product retrieved",
                inventoryService.getProduct(id)));
    }

    @GetMapping("/products/sku/{sku}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ProductResponse>>
    getProductBySku(@PathVariable String sku) {
        return ResponseEntity.ok(ApiResponse.success(
                "Product retrieved",
                inventoryService.getProductBySku(sku)));
    }

    @GetMapping("/products/category/{category}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ProductResponse>>>
    getByCategory(@PathVariable Category category) {
        return ResponseEntity.ok(ApiResponse.success(
                "Products retrieved",
                inventoryService.getProductsByCategory(category)));
    }

    @PatchMapping("/products/{id}/stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER', 'CASHIER')")
    public ResponseEntity<ApiResponse<ProductResponse>> updateStock(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStockRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                "Stock updated successfully",
                inventoryService.updateStock(id, request)));
    }

    @GetMapping("/products/low-stock")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<List<ProductResponse>>>
    getLowStock() {
        return ResponseEntity.ok(ApiResponse.success(
                "Low stock products retrieved",
                inventoryService.getLowStockProducts()));
    }

    @DeleteMapping("/products/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> decommission(
            @PathVariable UUID id) {
        inventoryService.decommissionProduct(id);
        return ResponseEntity.ok(
                ApiResponse.success("Product decommissioned", null));
    }

    @GetMapping("/products/{id}/transactions")
    @PreAuthorize("hasAnyRole('ADMIN', 'STORE_MANAGER')")
    public ResponseEntity<ApiResponse<List<StockTransactionResponse>>>
    getStockHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Stock history retrieved",
                inventoryService.getStockHistory(id)));
    }
}
