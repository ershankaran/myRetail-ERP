package com.myretailerp.pos.repository;

import com.myretailerp.pos.entity.Sale;
import com.myretailerp.pos.entity.SaleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface SaleRepository extends JpaRepository<Sale, UUID> {
    List<Sale> findByStoreIdAndCreatedAtBetween(String storeId,
                                                LocalDateTime from,
                                                LocalDateTime to);
    List<Sale> findByTerminalId(String terminalId);
    List<Sale> findByStatus(SaleStatus status);  // for PENDING_SYNC
    List<Sale> findByCashierId(String cashierId);
}
