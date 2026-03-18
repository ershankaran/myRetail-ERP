package com.myretailerp.finance.exception;

import java.util.UUID;

public class JournalEntryNotFoundException extends RuntimeException {
    public JournalEntryNotFoundException(UUID id) {
        super("Journal entry not found: " + id);
    }
    public JournalEntryNotFoundException(String reference) {
        super("Journal entry not found for reference: " + reference);
    }
}
