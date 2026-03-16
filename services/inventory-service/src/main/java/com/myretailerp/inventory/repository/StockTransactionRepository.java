package com.myretailerp.inventory.repository;

import com.myretailerp.inventory.entity.StockTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface StockTransactionRepository
        extends JpaRepository<StockTransaction, UUID> {

    List<StockTransaction> findByProductIdOrderByPerformedAtDesc(
            UUID productId);

    List<StockTransaction> findByPerformedByOrderByPerformedAtDesc(
            String performedBy);

    List<StockTransaction> findByProductIdAndPerformedAtBetween(
            UUID productId,
            LocalDateTime from,
            LocalDateTime to);
}
