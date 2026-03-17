package com.myretailerp.pos.repository;

import com.myretailerp.pos.entity.Receipt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface ReceiptRepository extends JpaRepository<Receipt, UUID> {
    Optional<Receipt> findBySaleId(UUID saleId);
    Optional<Receipt> findByReceiptNumber(String receiptNumber);

    @Query("SELECT COUNT(r) FROM Receipt r WHERE r.receiptNumber LIKE :prefix%")
    long countByReceiptNumberPrefix(String prefix);
}
