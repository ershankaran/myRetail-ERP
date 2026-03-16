package com.myretailerp.inventory.service;

import com.myretailerp.inventory.dto.CreateProductRequest;
import com.myretailerp.inventory.dto.ProductResponse;
import com.myretailerp.inventory.dto.StockTransactionResponse;
import com.myretailerp.inventory.dto.UpdateStockRequest;
import com.myretailerp.inventory.entity.Category;
import com.myretailerp.inventory.entity.Product;
import com.myretailerp.inventory.entity.StockLevel;
import com.myretailerp.inventory.entity.StockTransaction;
import com.myretailerp.inventory.entity.TransactionReason;
import com.myretailerp.inventory.exception.InsufficientStockException;
import com.myretailerp.inventory.exception.ProductAlreadyExistsException;
import com.myretailerp.inventory.exception.ProductNotFoundException;
import com.myretailerp.inventory.kafka.InventoryEventPublisher;
import com.myretailerp.inventory.repository.ProductRepository;
import com.myretailerp.inventory.repository.StockLevelRepository;
import com.myretailerp.inventory.repository.StockTransactionRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryService {

    private final ProductRepository productRepository;
    private final StockLevelRepository stockLevelRepository;
    private final InventoryEventPublisher eventPublisher;
    private final StockTransactionRepository stockTransactionRepository;

    @Transactional
    public ProductResponse createProduct(CreateProductRequest request) {
        if (productRepository.existsBySku(request.sku())) {
            throw new ProductAlreadyExistsException(request.sku());
        }
        Product product = Product.builder()
                .sku(request.sku())
                .name(request.name())
                .description(request.description())
                .category(request.category())
                .price(request.price())
                .supplierName(request.supplierName())
                .warehouseLocation(request.warehouseLocation())
                .reorderThreshold(request.reorderThreshold())
                .active(true)
                .build();
        productRepository.save(product);

        StockLevel stock = StockLevel.builder()
                .product(product)
                .quantity(request.initialQuantity())
                .build();
        stockLevelRepository.save(stock);

        StockTransaction initialTx = StockTransaction.builder()
                .product(product)
                .quantityBefore(0)
                .quantityAfter(request.initialQuantity())
                .quantityChange(request.initialQuantity())
                .reason(TransactionReason.INITIAL)
                .referenceId(null)
                .performedBy(getCurrentUserEmail())
                .build();
        stockTransactionRepository.save(initialTx);

        eventPublisher.publishProductCreated(product);

        if (request.initialQuantity() <= request.reorderThreshold()) {
            eventPublisher.publishStockLow(product, stock);
        }

        log.info("Product created: {} ({})",
                product.getName(), product.getSku());
        return ProductResponse.from(product, stock);
    }

    @Transactional
    public ProductResponse updateStock(UUID productId,
                                       UpdateStockRequest request) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        if (!product.isActive()) {
            throw new ProductNotFoundException(productId);
        }

        StockLevel stock = stockLevelRepository
                .findByProductId(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        int previousQty = stock.getQuantity();
        int newQty = previousQty + request.quantityChange();

        if (newQty < 0) {
            throw new InsufficientStockException(
                    product.getSku(), previousQty,
                    Math.abs(request.quantityChange()));
        }

        stock.setQuantity(newQty);
        stockLevelRepository.save(stock);

        // ← Record audit trail
        String performedBy = getCurrentUserEmail();
        StockTransaction tx = StockTransaction.builder()
                .product(product)
                .quantityBefore(previousQty)
                .quantityAfter(newQty)
                .quantityChange(request.quantityChange())
                .reason(TransactionReason.valueOf(request.reason()))
                .referenceId(request.referenceId())
                .performedBy(performedBy)
                .build();
        stockTransactionRepository.save(tx);

        eventPublisher.publishStockUpdated(
                product, previousQty, newQty, request.reason());

        if (newQty == 0) {
            eventPublisher.publishStockDepleted(product);
            log.warn("Stock DEPLETED for SKU: {}", product.getSku());
        } else if (newQty <= product.getReorderThreshold()) {
            eventPublisher.publishStockLow(product, stock);
            log.warn("Stock LOW for SKU: {} qty={} threshold={}",
                    product.getSku(), newQty,
                    product.getReorderThreshold());
        }

        return ProductResponse.from(product, stock);
    }

    @Transactional
    public void decommissionProduct(UUID productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
        product.setActive(false);
        product.setDecommissionedAt(LocalDateTime.now());
        productRepository.save(product);
        eventPublisher.publishProductDecommissioned(product);
        log.info("Product decommissioned: {}", product.getSku());
    }

    @Transactional(readOnly = true)
    public ProductResponse getProduct(UUID productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
        StockLevel stock = stockLevelRepository
                .findByProductId(productId).orElse(null);
        return ProductResponse.from(product, stock);
    }

    @Transactional(readOnly = true)
    public ProductResponse getProductBySku(String sku) {
        Product product = productRepository.findBySku(sku)
                .orElseThrow(() -> new ProductNotFoundException(sku));
        StockLevel stock = stockLevelRepository
                .findByProduct(product).orElse(null);
        return ProductResponse.from(product, stock);
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getAllActiveProducts() {
        return productRepository.findByActiveTrue().stream()
                .map(p -> ProductResponse.from(p,
                        stockLevelRepository.findByProduct(p)
                                .orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getProductsByCategory(Category category) {
        return productRepository
                .findByCategoryAndActiveTrue(category).stream()
                .map(p -> ProductResponse.from(p,
                        stockLevelRepository.findByProduct(p)
                                .orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getLowStockProducts() {
        return stockLevelRepository.findAllLowStock().stream()
                .map(s -> ProductResponse.from(s.getProduct(), s))
                .toList();
    }

    private String getCurrentUserEmail() {
        return Optional.ofNullable(
                        SecurityContextHolder.getContext().getAuthentication())
                .map(auth -> auth.getName())
                .orElse("system");
    }

    @Transactional(readOnly = true)
    public List<StockTransactionResponse> getStockHistory(UUID productId) {
        // Verify product exists first
        if (!productRepository.existsById(productId)) {
            throw new ProductNotFoundException(productId);
        }
        return stockTransactionRepository
                .findByProductIdOrderByPerformedAtDesc(productId)
                .stream()
                .map(StockTransactionResponse::from)
                .toList();
    }
}



