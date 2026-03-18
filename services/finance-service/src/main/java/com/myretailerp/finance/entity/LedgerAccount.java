package com.myretailerp.finance.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ledger_accounts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LedgerAccount {

    @Id
    @GeneratedValue
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String accountCode;     // e.g. "1001"

    @Column(nullable = false)
    private String accountName;     // e.g. "Cash"

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AccountType accountType;

    @Column(nullable = false, precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime lastUpdated;

    @Version
    private Long version;           // optimistic locking on balance updates

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastUpdated = LocalDateTime.now();
    }
}
