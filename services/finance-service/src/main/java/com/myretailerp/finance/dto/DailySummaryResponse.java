package com.myretailerp.finance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailySummaryResponse(
        LocalDate date,
        BigDecimal totalRevenue,
        BigDecimal posSalesRevenue,
        BigDecimal onlineSalesRevenue,
        BigDecimal totalVoids,
        BigDecimal netRevenue,
        long totalTransactions,
        long posTransactions,
        long onlineTransactions
) {}
