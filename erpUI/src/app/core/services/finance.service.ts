import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../shared/models/api-response.model';
import { JournalEntry, LedgerAccount, DailySummary } from '../../shared/models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private base = `${environment.apiUrls.finance}/finance`;
  constructor(private http: HttpClient) {}

  getJournalEntries(): Observable<ApiResponse<JournalEntry[]>> {
    return this.http.get<ApiResponse<JournalEntry[]>>(`${this.base}/journal-entries`);
  }
  getLedger(): Observable<ApiResponse<LedgerAccount[]>> {
    return this.http.get<ApiResponse<LedgerAccount[]>>(`${this.base}/ledger`);
  }
  getDailySummary(date?: string): Observable<ApiResponse<DailySummary>> {
    const p = date ? `?date=${date}` : '';
    return this.http.get<ApiResponse<DailySummary>>(`${this.base}/reports/daily-summary${p}`);
  }
}
