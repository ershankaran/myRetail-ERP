package com.myretailerp.finance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "journal_entry_lines")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JournalEntryLine {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journal_entry_id", nullable = false)
    private JournalEntry journalEntry;

    @Column(nullable = false)
    private String accountCode;

    @Column(nullable = false)
    private String accountName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EntryType entryType;    // DEBIT or CREDIT

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;
}
