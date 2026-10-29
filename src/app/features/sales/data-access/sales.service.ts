import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { Sale, CreateSaleInput, CreateSaleResult, MessageResult } from './sale.model';

@Injectable({ providedIn: 'root' })
export class SalesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/$/, '');

  create(input: CreateSaleInput): Observable<CreateSaleResult> {
    return this.http.post<CreateSaleResult>(`${this.baseUrl}/sales`, input, {
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
  }

  deleteSale(id: number): Observable<MessageResult> {
    return this.http.delete<MessageResult>(`${this.baseUrl}/sales/${id}`, {
      headers: { Accept: 'application/json' },
    });
  }

  list(): Observable<Sale[]> {
    return this.http.get<Sale[]>(`${this.baseUrl}/sales`, {
      headers: { Accept: 'application/json' },
    });
  }
}
