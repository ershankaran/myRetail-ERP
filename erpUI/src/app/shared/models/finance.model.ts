export type AccountType = 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE';
export type EntryType = 'DEBIT' | 'CREDIT';
export type JournalEntryStatus = 'POSTED' | 'REVERSED';
export type ReferenceType = 'ONLINE_ORDER' | 'POS_SALE' | 'POS_VOID' | 'PAYROLL' | 'PURCHASE_ORDER';

export interface LedgerAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  currentBalance: number;
  lastUpdated: string;
}

export interface JournalEntryLine {
  id: string;
  accountCode: string;
  accountName: string;
  entryType: EntryType;
  amount: number;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  referenceType: ReferenceType;
  referenceId: string;
  description: string;
  totalAmount: number;
  status: JournalEntryStatus;
  postedBy: string;
  lines: JournalEntryLine[];
  createdAt: string;
}

export interface DailySummary {
  date: string;
  totalRevenue: number;
  posSalesRevenue: number;
  onlineSalesRevenue: number;
  totalVoids: number;
  netRevenue: number;
  totalTransactions: number;
  posTransactions: number;
  onlineTransactions: number;
}
