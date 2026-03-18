package com.myretailerp.finance.repository;

import com.myretailerp.finance.entity.JournalEntry;
import com.myretailerp.finance.entity.JournalEntryStatus;
import com.myretailerp.finance.entity.ReferenceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JournalEntryRepository
        extends JpaRepository<JournalEntry, UUID> {

    Optional<JournalEntry> findByEntryNumber(String entryNumber);
    Optional<JournalEntry> findByReferenceId(String referenceId);
    boolean existsByReferenceId(String referenceId);

    List<JournalEntry> findByReferenceType(ReferenceType type);
    List<JournalEntry> findByStatus(JournalEntryStatus status);

    List<JournalEntry> findByCreatedAtBetween(
            LocalDateTime from, LocalDateTime to);

    @Query("SELECT COUNT(j) FROM JournalEntry j " +
            "WHERE j.entryNumber LIKE :prefix%")
    long countByEntryNumberPrefix(String prefix);
}
