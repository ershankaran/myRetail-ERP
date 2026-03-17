package com.myretailerp.inventory.repository;

import com.myretailerp.inventory.entity.Product;
import com.myretailerp.inventory.entity.StockLevel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StockLevelRepository
        extends JpaRepository<StockLevel, UUID> {

    Optional<StockLevel> findByProduct(Product product);
    Optional<StockLevel> findByProductId(UUID productId);

    @Query("""
        SELECT s FROM StockLevel s
        WHERE s.quantity <= s.product.reorderThreshold
        AND s.product.active = true
    """)
    List<StockLevel> findAllLowStock();

    @Query("""
        SELECT s FROM StockLevel s
        WHERE s.quantity = 0
        AND s.product.active = true
    """)
    List<StockLevel> findAllDepleted();

    @Query(value = "SELECT reserved_quantity FROM stock_levels WHERE product_id = :productId",
            nativeQuery = true)
    Integer findReservedQuantityByProductId(@Param("productId") UUID productId);
}
