package com.myretailerp.inventory.service;

import com.myretailerp.inventory.dto.CreateProductRequest;
import com.myretailerp.inventory.dto.ProductResponse;
import com.myretailerp.inventory.dto.StockTransactionResponse;
import com.myretailerp.inventory.dto.UpdateStockRequest;
import com.myretailerp.inventory.entity.Category;
import com.myretailerp.inventory.entity.Product;
import com.myretailerp.inventory.entity.ReservationStatus;
import com.myretailerp.inventory.entity.StockLevel;
import com.myretailerp.inventory.entity.StockReservation;
import com.myretailerp.inventory.entity.StockTransaction;
import com.myretailerp.inventory.entity.TransactionReason;
import com.myretailerp.inventory.exception.InsufficientStockException;
import com.myretailerp.inventory.exception.ProductAlreadyExistsException;
import com.myretailerp.inventory.exception.ProductNotFoundException;
import com.myretailerp.inventory.kafka.InventoryEventPublisher;
import com.myretailerp.inventory.kafka.event.OrderCreatedEvent;
import com.myretailerp.inventory.kafka.event.OrderItemEvent;
import com.myretailerp.inventory.repository.ProductRepository;
import com.myretailerp.inventory.repository.StockLevelRepository;
import com.myretailerp.inventory.repository.StockReservationRepository;
import com.myretailerp.inventory.repository.StockTransactionRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private final StockReservationRepository stockReservationRepository;

    @PersistenceContext
    private EntityManager entityManager;

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
    public void doUpdateStock(UUID productId, UpdateStockRequest request) {
        // all the existing save logic here — no return value
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        if (!product.isActive()) throw new ProductNotFoundException(productId);

        StockLevel stock = stockLevelRepository.findByProductId(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));

        int previousQty = stock.getQuantity();
        int newQty = previousQty + request.quantityChange();

        if (newQty < 0) throw new InsufficientStockException(
                product.getSku(), previousQty,
                Math.abs(request.quantityChange()));

        stock.setQuantity(newQty);
        stockLevelRepository.save(stock);

        StockTransaction tx = StockTransaction.builder()
                .product(product)
                .quantityBefore(previousQty)
                .quantityAfter(newQty)
                .quantityChange(request.quantityChange())
                .reason(TransactionReason.valueOf(request.reason()))
                .referenceId(request.referenceId())
                .performedBy(getCurrentUserEmail())
                .build();
        stockTransactionRepository.save(tx);

        eventPublisher.publishStockUpdated(
                product, previousQty, newQty, request.reason());

        if (newQty == 0) {
            eventPublisher.publishStockDepleted(product);
        } else if (newQty <= product.getReorderThreshold()) {
            eventPublisher.publishStockLow(product, stock);
        }
    }

    // No @Transactional here — reads AFTER the transaction above commits
    public ProductResponse updateStock(UUID productId,
                                       UpdateStockRequest request) {
        doUpdateStock(productId, request);  // commits here

        // Now read fresh — transaction is closed, cache is gone
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
        StockLevel freshStock = stockLevelRepository
                .findByProductId(productId)
                .orElseThrow();

        return ProductResponse.from(product, freshStock);
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

    // ─── RESERVE STOCK (triggered by order.created) ──────────────────
    @Transactional
    public void reserveStock(OrderCreatedEvent event) {
        List<String> failedSkus = new ArrayList<>();

        for (OrderItemEvent item : event.items()) {
            Product product = productRepository
                    .findById(item.productId())
                    .orElse(null);

            if (product == null || !product.isActive()) {
                failedSkus.add(item.sku());
                continue;
            }

            StockLevel stock = stockLevelRepository
                    .findByProductId(item.productId())
                    .orElse(null);

            if (stock == null ||
                    stock.getAvailableQuantity() < item.quantity()) {
                failedSkus.add(item.sku());
                continue;
            }

            // Reserve the stock
            stock.setReservedQuantity(
                    stock.getReservedQuantity() + item.quantity());
            stockLevelRepository.save(stock);

            // Record the reservation
            StockReservation reservation = StockReservation.builder()
                    .orderId(event.orderId())
                    .product(product)
                    .reservedQuantity(item.quantity())
                    .status(ReservationStatus.RESERVED)
                    .build();
            stockReservationRepository.save(reservation);

            log.info("Reserved {} units of {} for order {}",
                    item.quantity(), item.sku(), event.orderId());
        }

        if (!failedSkus.isEmpty()) {
            // Rollback any reservations made in this loop
            rollbackReservations(event.orderId());
            eventPublisher.publishReservationFailed(
                    event.orderId(), failedSkus);
            log.warn("Reservation FAILED for order {} — SKUs: {}",
                    event.orderId(), failedSkus);
        } else {
            eventPublisher.publishStockReserved(event.orderId(),
                    event.items());
            log.info("Reservation SUCCESS for order {}",
                    event.orderId());
        }
    }

    // ─── CONFIRM RESERVATION (triggered by order.confirmed) ──────────
    @Transactional
    public void confirmReservation(UUID orderId) {
        List<StockReservation> reservations =
                stockReservationRepository.findByOrderIdAndStatus(
                        orderId, ReservationStatus.RESERVED);

        for (StockReservation reservation : reservations) {
            StockLevel stock = stockLevelRepository
                    .findByProductId(reservation.getProduct().getId())
                    .orElseThrow();

            int previousQty = stock.getQuantity();
            int newQty = previousQty - reservation.getReservedQuantity();

            // Physically deduct from stock
            stock.setQuantity(newQty);
            stock.setReservedQuantity(
                    stock.getReservedQuantity()
                            - reservation.getReservedQuantity());
            stockLevelRepository.save(stock);

            // Mark reservation confirmed
            reservation.setStatus(ReservationStatus.CONFIRMED);
            reservation.setResolvedAt(LocalDateTime.now());
            stockReservationRepository.save(reservation);

            // Audit trail
            StockTransaction tx = StockTransaction.builder()
                    .product(reservation.getProduct())
                    .quantityBefore(previousQty)
                    .quantityAfter(newQty)
                    .quantityChange(-reservation.getReservedQuantity())
                    .reason(TransactionReason.SALE)
                    .referenceId(orderId.toString())
                    .performedBy("system")
                    .build();
            stockTransactionRepository.save(tx);

            // Check thresholds
            if (newQty == 0) {
                eventPublisher.publishStockDepleted(
                        reservation.getProduct());
            } else if (newQty <= reservation.getProduct()
                    .getReorderThreshold()) {
                eventPublisher.publishStockLow(
                        reservation.getProduct(), stock);
            }

            log.info("Confirmed reservation for order {} — SKU: {} qty: {}",
                    orderId,
                    reservation.getProduct().getSku(),
                    reservation.getReservedQuantity());
        }
    }

    // ─── RELEASE RESERVATION (triggered by order.cancelled) ──────────
    @Transactional
    public void releaseReservation(UUID orderId) {
        List<StockReservation> reservations =
                stockReservationRepository.findByOrderIdAndStatus(
                        orderId, ReservationStatus.RESERVED);

        for (StockReservation reservation : reservations) {
            StockLevel stock = stockLevelRepository
                    .findByProductId(reservation.getProduct().getId())
                    .orElseThrow();

            // Return reserved quantity back to available
            stock.setReservedQuantity(
                    stock.getReservedQuantity()
                            - reservation.getReservedQuantity());
            stockLevelRepository.save(stock);

            // Mark reservation released
            reservation.setStatus(ReservationStatus.RELEASED);
            reservation.setResolvedAt(LocalDateTime.now());
            stockReservationRepository.save(reservation);

            log.info("Released reservation for order {} — SKU: {} qty: {}",
                    orderId,
                    reservation.getProduct().getSku(),
                    reservation.getReservedQuantity());
        }
    }

    // ─── PRIVATE: rollback partial reservations on failure ───────────
    private void rollbackReservations(UUID orderId) {
        List<StockReservation> partial =
                stockReservationRepository.findByOrderIdAndStatus(
                        orderId, ReservationStatus.RESERVED);

        for (StockReservation r : partial) {
            StockLevel stock = stockLevelRepository
                    .findByProductId(r.getProduct().getId())
                    .orElseThrow();
            stock.setReservedQuantity(
                    stock.getReservedQuantity() - r.getReservedQuantity());
            stockLevelRepository.save(stock);
            r.setStatus(ReservationStatus.RELEASED);
            r.setResolvedAt(LocalDateTime.now());
            stockReservationRepository.save(r);
        }
    }
}



