package com.myretailerp.finance.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "journal_entries",
        indexes = {
                @Index(columnList = "reference_id", name = "idx_je_reference_id"),
                @Index(columnList = "created_at",   name = "idx_je_created_at"),
                @Index(columnList = "reference_type", name = "idx_je_reference_type")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JournalEntry {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String entryNumber;     // JE-20260317-00001

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ReferenceType referenceType;

    @Column(nullable = false)
    private String referenceId;     // orderId or saleId (String for flexibility)

    @Column(nullable = false)
    private String description;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private JournalEntryStatus status = JournalEntryStatus.POSTED;

    @Column
    private UUID reversedByEntryId; // points to the reversal entry

    @Column(nullable = false)
    private String postedBy;        // cashierId / "system"

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "journalEntry",
            cascade = CascadeType.ALL,
            orphanRemoval = true)
    @Builder.Default
    private List<JournalEntryLine> lines = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
