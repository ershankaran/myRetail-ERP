package com.myretailerp.finance.dto;

import com.myretailerp.finance.entity.JournalEntry;
import com.myretailerp.finance.entity.JournalEntryStatus;
import com.myretailerp.finance.entity.ReferenceType;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record JournalEntryResponse(
        UUID id,
        String entryNumber,
        ReferenceType referenceType,
        String referenceId,
        String description,
        BigDecimal totalAmount,
        JournalEntryStatus status,
        String postedBy,
        List<JournalEntryLineResponse> lines,
        LocalDateTime createdAt
) {
    public static JournalEntryResponse from(JournalEntry entry) {
        return new JournalEntryResponse(
                entry.getId(),
                entry.getEntryNumber(),
                entry.getReferenceType(),
                entry.getReferenceId(),
                entry.getDescription(),
                entry.getTotalAmount(),
                entry.getStatus(),
                entry.getPostedBy(),
                entry.getLines().stream()
                        .map(JournalEntryLineResponse::from)
                        .toList(),
                entry.getCreatedAt()
        );
    }
}
