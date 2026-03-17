package com.myretailerp.pos.repository;

import com.myretailerp.pos.entity.Terminal;
import com.myretailerp.pos.entity.TerminalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TerminalRepository
        extends JpaRepository<Terminal, UUID> {
    Optional<Terminal> findByTerminalCode(String terminalCode);
    List<Terminal> findByStoreId(String storeId);
    List<Terminal> findByStoreIdAndStatus(String storeId,
                                          TerminalStatus status);
    boolean existsByTerminalCode(String terminalCode);
}
