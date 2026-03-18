package com.myretailerp.finance.dto;

import com.myretailerp.finance.entity.AccountType;
import com.myretailerp.finance.entity.LedgerAccount;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record LedgerAccountResponse(
        UUID id,
        String accountCode,
        String accountName,
        AccountType accountType,
        BigDecimal currentBalance,
        LocalDateTime lastUpdated
) {
    public static LedgerAccountResponse from(LedgerAccount account) {
        return new LedgerAccountResponse(
                account.getId(),
                account.getAccountCode(),
                account.getAccountName(),
                account.getAccountType(),
                account.getCurrentBalance(),
                account.getLastUpdated()
        );
    }
}
