package com.myretailerp.finance.controller;

import com.myretailerp.common.dto.ApiResponse;
import com.myretailerp.finance.dto.DailySummaryResponse;
import com.myretailerp.finance.dto.JournalEntryResponse;
import com.myretailerp.finance.dto.LedgerAccountResponse;
import com.myretailerp.finance.service.FinanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService financeService;

    // ─── JOURNAL ENTRIES ──────────────────────────────────────────

    @GetMapping("/journal-entries")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<List<JournalEntryResponse>>>
    getAllEntries() {
        return ResponseEntity.ok(ApiResponse.success(
                "Journal entries retrieved",
                financeService.getAllEntries()));
    }

    @GetMapping("/journal-entries/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<JournalEntryResponse>>
    getEntry(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(
                "Journal entry retrieved",
                financeService.getEntry(id)));
    }

    @GetMapping("/journal-entries/ref/{referenceId}")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<JournalEntryResponse>>
    getEntryByReference(@PathVariable String referenceId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Journal entry retrieved",
                financeService.getEntryByReference(referenceId)));
    }

    // ─── LEDGER ───────────────────────────────────────────────────

    @GetMapping("/ledger")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<List<LedgerAccountResponse>>>
    getAllAccounts() {
        return ResponseEntity.ok(ApiResponse.success(
                "Ledger accounts retrieved",
                financeService.getAllAccounts()));
    }

    @GetMapping("/ledger/{accountCode}")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<LedgerAccountResponse>>
    getAccount(@PathVariable String accountCode) {
        return ResponseEntity.ok(ApiResponse.success(
                "Account retrieved",
                financeService.getAccount(accountCode)));
    }

    // ─── REPORTS ──────────────────────────────────────────────────

    @GetMapping("/reports/daily-summary")
    @PreAuthorize("hasAnyRole('ADMIN','FINANCE')")
    public ResponseEntity<ApiResponse<DailySummaryResponse>>
    getDailySummary(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date) {
        LocalDate targetDate = date != null ? date : LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(
                "Daily summary retrieved",
                financeService.getDailySummary(targetDate)));
    }
}
