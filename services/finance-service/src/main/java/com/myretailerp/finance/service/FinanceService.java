package com.myretailerp.finance.service;

import com.myretailerp.finance.dto.DailySummaryResponse;
import com.myretailerp.finance.dto.JournalEntryResponse;
import com.myretailerp.finance.dto.LedgerAccountResponse;
import com.myretailerp.finance.entity.*;
import com.myretailerp.finance.exception.JournalEntryNotFoundException;
import com.myretailerp.finance.kafka.event.OrderCancelledEvent;
import com.myretailerp.finance.kafka.event.OrderFinanceEvent;
import com.myretailerp.finance.kafka.event.SaleCompletedEvent;
import com.myretailerp.finance.kafka.event.SaleVoidedEvent;
import com.myretailerp.finance.repository.JournalEntryRepository;
import com.myretailerp.finance.repository.LedgerAccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class FinanceService {

    private final JournalEntryRepository journalEntryRepository;
    private final LedgerAccountRepository ledgerAccountRepository;

    // ─── ONLINE ORDER ─────────────────────────────────────────────
    @Transactional
    public void recordOnlineOrder(OrderFinanceEvent event) {

        // Idempotency check
        if (journalEntryRepository.existsByReferenceId(
                event.orderId().toString())) {
            log.warn("Duplicate finance event ignored for order: {}",
                    event.orderId());
            return;
        }

        String entryNumber = generateEntryNumber();

        /*
         * Online Order — double entry:
         *   DEBIT  Accounts Receivable (1100)  +amount
         *   CREDIT Online Sales Revenue (4002)  +amount
         */
        JournalEntry entry = JournalEntry.builder()
                .entryNumber(entryNumber)
                .referenceType(ReferenceType.ONLINE_ORDER)
                .referenceId(event.orderId().toString())
                .description("Online order confirmed: " +
                        event.orderId())
                .totalAmount(event.totalAmount())
                .postedBy("system")
                .status(JournalEntryStatus.POSTED)
                .build();

        JournalEntryLine debitLine = JournalEntryLine.builder()
                .journalEntry(entry)
                .accountCode("1100")
                .accountName("Accounts Receivable")
                .entryType(EntryType.DEBIT)
                .amount(event.totalAmount())
                .build();

        JournalEntryLine creditLine = JournalEntryLine.builder()
                .journalEntry(entry)
                .accountCode("4002")
                .accountName("Online Sales Revenue")
                .entryType(EntryType.CREDIT)
                .amount(event.totalAmount())
                .build();

        entry.getLines().add(debitLine);
        entry.getLines().add(creditLine);
        journalEntryRepository.save(entry);

        // Update ledger balances
        updateLedgerBalance("1100", EntryType.DEBIT,
                event.totalAmount());
        updateLedgerBalance("4002", EntryType.CREDIT,
                event.totalAmount());

        log.info("Journal entry posted: {} for online order: {}",
                entryNumber, event.orderId());
    }

    // ─── POS SALE ─────────────────────────────────────────────────
    @Transactional
    public void recordPosSale(SaleCompletedEvent event) {

        if (journalEntryRepository.existsByReferenceId(
                event.saleId().toString())) {
            log.warn("Duplicate finance event ignored for sale: {}",
                    event.saleId());
            return;
        }

        // Determine debit account based on payment method
        String debitAccountCode = switch (event.paymentMethod()) {
            case "CASH" -> "1001";
            case "CARD" -> "1002";
            case "UPI"  -> "1003";
            default     -> "1001";
        };
        String debitAccountName = switch (event.paymentMethod()) {
            case "CASH" -> "Cash";
            case "CARD" -> "Card Receivable";
            case "UPI"  -> "UPI Receivable";
            default     -> "Cash";
        };

        String entryNumber = generateEntryNumber();

        /*
         * POS Sale — double entry:
         *   DEBIT  Cash / Card Receivable / UPI (1001/1002/1003) +amount
         *   CREDIT POS Sales Revenue (4001)                       +amount
         */
        JournalEntry entry = JournalEntry.builder()
                .entryNumber(entryNumber)
                .referenceType(ReferenceType.POS_SALE)
                .referenceId(event.saleId().toString())
                .description(String.format(
                        "POS sale at %s terminal %s receipt %s",
                        event.storeId(), event.terminalId(),
                        event.receiptNumber()))
                .totalAmount(event.totalAmount())
                .postedBy(event.cashierId())
                .status(JournalEntryStatus.POSTED)
                .build();

        JournalEntryLine debitLine = JournalEntryLine.builder()
                .journalEntry(entry)
                .accountCode(debitAccountCode)
                .accountName(debitAccountName)
                .entryType(EntryType.DEBIT)
                .amount(event.totalAmount())
                .build();

        JournalEntryLine creditLine = JournalEntryLine.builder()
                .journalEntry(entry)
                .accountCode("4001")
                .accountName("POS Sales Revenue")
                .entryType(EntryType.CREDIT)
                .amount(event.totalAmount())
                .build();

        entry.getLines().add(debitLine);
        entry.getLines().add(creditLine);
        journalEntryRepository.save(entry);

        // Update ledger balances
        updateLedgerBalance(debitAccountCode, EntryType.DEBIT,
                event.totalAmount());
        updateLedgerBalance("4001", EntryType.CREDIT,
                event.totalAmount());

        log.info("Journal entry posted: {} for POS sale: {}",
                entryNumber, event.saleId());
    }

    // ─── POS VOID ─────────────────────────────────────────────────
    @Transactional
    public void recordPosVoid(SaleVoidedEvent event) {

        // Find the original sale entry
        JournalEntry original = journalEntryRepository
                .findByReferenceId(event.saleId().toString())
                .orElse(null);

        if (original == null) {
            log.warn("Original entry not found for voided sale: {}",
                    event.saleId());
            return;
        }

        if (original.getStatus() == JournalEntryStatus.REVERSED) {
            log.warn("Sale {} already reversed", event.saleId());
            return;
        }

        String entryNumber = generateEntryNumber();

        /*
         * POS Void — reverse the original entry:
         *   DEBIT  POS Sales Revenue (4001)                    +amount
         *   CREDIT Cash / Card / UPI (1001/1002/1003)          +amount
         *
         * This exactly cancels the original entry.
         */
        JournalEntry reversal = JournalEntry.builder()
                .entryNumber(entryNumber)
                .referenceType(ReferenceType.POS_VOID)
                .referenceId(event.saleId().toString() + "-VOID")
                .description("Void of POS sale: " + event.saleId()
                        + " reason: " + event.reason())
                .totalAmount(original.getTotalAmount())
                .postedBy(event.cashierId())
                .status(JournalEntryStatus.POSTED)
                .build();

        // Reverse each line from the original entry
        for (JournalEntryLine originalLine : original.getLines()) {
            EntryType reversedType = originalLine.getEntryType() ==
                    EntryType.DEBIT ? EntryType.CREDIT : EntryType.DEBIT;

            JournalEntryLine reversalLine = JournalEntryLine.builder()
                    .journalEntry(reversal)
                    .accountCode(originalLine.getAccountCode())
                    .accountName(originalLine.getAccountName())
                    .entryType(reversedType)
                    .amount(originalLine.getAmount())
                    .build();

            reversal.getLines().add(reversalLine);

            // Update ledger balance (reverse direction)
            updateLedgerBalance(originalLine.getAccountCode(),
                    reversedType, originalLine.getAmount());
        }

        journalEntryRepository.save(reversal);

        // Mark original as reversed
        original.setStatus(JournalEntryStatus.REVERSED);
        original.setReversedByEntryId(reversal.getId());
        journalEntryRepository.save(original);

        log.info("Reversal entry posted: {} for voided sale: {}",
                entryNumber, event.saleId());
    }

    // ─── QUERY METHODS ────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<JournalEntryResponse> getAllEntries() {
        return journalEntryRepository.findAll().stream()
                .map(JournalEntryResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public JournalEntryResponse getEntry(UUID id) {
        return journalEntryRepository.findById(id)
                .map(JournalEntryResponse::from)
                .orElseThrow(() ->
                        new JournalEntryNotFoundException(id));
    }

    @Transactional(readOnly = true)
    public JournalEntryResponse getEntryByReference(String referenceId) {
        return journalEntryRepository.findByReferenceId(referenceId)
                .map(JournalEntryResponse::from)
                .orElseThrow(() ->
                        new JournalEntryNotFoundException(referenceId));
    }

    @Transactional(readOnly = true)
    public List<LedgerAccountResponse> getAllAccounts() {
        return ledgerAccountRepository.findAll().stream()
                .map(LedgerAccountResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public LedgerAccountResponse getAccount(String accountCode) {
        return ledgerAccountRepository.findByAccountCode(accountCode)
                .map(LedgerAccountResponse::from)
                .orElseThrow(() -> new RuntimeException(
                        "Account not found: " + accountCode));
    }

    @Transactional(readOnly = true)
    public DailySummaryResponse getDailySummary(LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(23, 59, 59);

        List<JournalEntry> entries = journalEntryRepository
                .findByCreatedAtBetween(start, end);

        BigDecimal posRevenue = entries.stream()
                .filter(e -> e.getReferenceType() ==
                        ReferenceType.POS_SALE
                        && e.getStatus() == JournalEntryStatus.POSTED)
                .map(JournalEntry::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal onlineRevenue = entries.stream()
                .filter(e -> e.getReferenceType() ==
                        ReferenceType.ONLINE_ORDER
                        && e.getStatus() == JournalEntryStatus.POSTED)
                .map(JournalEntry::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal voids = entries.stream()
                .filter(e -> e.getReferenceType() ==
                        ReferenceType.POS_VOID)
                .map(JournalEntry::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long posCount = entries.stream()
                .filter(e -> e.getReferenceType() ==
                        ReferenceType.POS_SALE).count();

        long onlineCount = entries.stream()
                .filter(e -> e.getReferenceType() ==
                        ReferenceType.ONLINE_ORDER).count();

        return new DailySummaryResponse(
                date,
                posRevenue.add(onlineRevenue),
                posRevenue,
                onlineRevenue,
                voids,
                posRevenue.add(onlineRevenue).subtract(voids),
                posCount + onlineCount,
                posCount,
                onlineCount
        );
    }

    // ─── HELPERS ──────────────────────────────────────────────────

    private void updateLedgerBalance(String accountCode,
                                     EntryType entryType,
                                     BigDecimal amount) {
        LedgerAccount account = ledgerAccountRepository
                .findByAccountCode(accountCode)
                .orElseThrow(() -> new RuntimeException(
                        "Ledger account not found: " + accountCode));

        AccountType type = account.getAccountType();

        // Double-entry balance rules
        boolean increases = (type == AccountType.ASSET &&
                entryType == EntryType.DEBIT)
                || (type == AccountType.LIABILITY &&
                entryType == EntryType.CREDIT)
                || (type == AccountType.REVENUE &&
                entryType == EntryType.CREDIT)
                || (type == AccountType.EXPENSE &&
                entryType == EntryType.DEBIT);

        if (increases) {
            account.setCurrentBalance(
                    account.getCurrentBalance().add(amount));
        } else {
            account.setCurrentBalance(
                    account.getCurrentBalance().subtract(amount));
        }

        account.setLastUpdated(LocalDateTime.now());
        ledgerAccountRepository.save(account);
    }

    @Transactional
    public void reverseOnlineOrder(OrderCancelledEvent event) {

        JournalEntry original = journalEntryRepository
                .findByReferenceId(event.orderId())
                .orElse(null);

        if (original == null) {
            log.warn("No finance entry found for cancelled order: {}",
                    event.orderId());
            return;
        }

        if (original.getStatus() == JournalEntryStatus.REVERSED) {
            log.warn("Order {} finance entry already reversed",
                    event.orderId());
            return;
        }

        String entryNumber = generateEntryNumber();

        /*
         * Online Order Cancellation — reverse the original:
         *   DEBIT  Online Sales Revenue (4002)    +amount
         *   CREDIT Accounts Receivable (1100)     +amount
         */
        JournalEntry reversal = JournalEntry.builder()
                .entryNumber(entryNumber)
                .referenceType(ReferenceType.ONLINE_ORDER)
                .referenceId(event.orderId().toString() + "-CANCEL")
                .description("Cancellation of online order: " +
                        event.orderId() + " reason: " +
                        event.reason())
                .totalAmount(original.getTotalAmount())
                .postedBy("system")
                .status(JournalEntryStatus.POSTED)
                .build();

        // Reverse each line from the original entry
        for (JournalEntryLine originalLine : original.getLines()) {
            EntryType reversedType = originalLine.getEntryType() ==
                    EntryType.DEBIT ? EntryType.CREDIT : EntryType.DEBIT;

            JournalEntryLine reversalLine = JournalEntryLine.builder()
                    .journalEntry(reversal)
                    .accountCode(originalLine.getAccountCode())
                    .accountName(originalLine.getAccountName())
                    .entryType(reversedType)
                    .amount(originalLine.getAmount())
                    .build();

            reversal.getLines().add(reversalLine);

            // Update ledger balance (reverse direction)
            updateLedgerBalance(originalLine.getAccountCode(),
                    reversedType, originalLine.getAmount());
        }

        journalEntryRepository.save(reversal);

        // Mark original as reversed
        original.setStatus(JournalEntryStatus.REVERSED);
        original.setReversedByEntryId(reversal.getId());
        journalEntryRepository.save(original);

        log.info("Reversal posted: {} for cancelled order: {}",
                entryNumber, event.orderId());
    }

    private String generateEntryNumber() {
        String date = LocalDate.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = "JE-" + date + "-";
        long count = journalEntryRepository
                .countByEntryNumberPrefix(prefix) + 1;
        return prefix + String.format("%05d", count);
    }
}
