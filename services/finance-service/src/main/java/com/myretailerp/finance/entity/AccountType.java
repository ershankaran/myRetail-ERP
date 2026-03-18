package com.myretailerp.finance.entity;

public enum AccountType {
    ASSET,      // what we own (cash, receivables, inventory)
    LIABILITY,  // what we owe (payables, tax)
    REVENUE,    // what we earn (sales)
    EXPENSE     // what we spend (COGS, payroll, procurement)
}
