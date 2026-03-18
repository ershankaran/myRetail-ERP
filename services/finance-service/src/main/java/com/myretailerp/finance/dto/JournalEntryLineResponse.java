package com.myretailerp.finance.dto;

import com.myretailerp.finance.entity.EntryType;
import com.myretailerp.finance.entity.JournalEntryLine;

import java.math.BigDecimal;
import java.util.UUID;

public record JournalEntryLineResponse(
        UUID id,
        String accountCode,
        String accountName,
        EntryType entryType,
        BigDecimal amount
) {
    public static JournalEntryLineResponse from(JournalEntryLine line) {
        return new JournalEntryLineResponse(
                line.getId(),
                line.getAccountCode(),
                line.getAccountName(),
                line.getEntryType(),
                line.getAmount()
        );
    }
}
