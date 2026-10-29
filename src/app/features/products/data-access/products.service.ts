import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../../../core/config/api.config';
import { Product } from './product.model';

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL).replace(/\/$/, '');

  list(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.baseUrl}/products`, {
      headers: { Accept: 'application/json' },
    });
  }
}
