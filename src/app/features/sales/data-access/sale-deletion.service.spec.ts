import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { vi } from 'vitest';
import { API_BASE_URL } from '../../../core/config/api.config';
import { Sale } from './sale.model';
import { SaleDeletionService } from './sale-deletion.service';

const sale: Sale = {
  id: 3,
  user_id: 1,
  total: '150.53',
  created_at: '2026-10-29T00:58:07.000Z',
  details: [],
};

describe('SaleDeletionService', () => {
  let deletion: SaleDeletionService;
  let http: HttpTestingController;
  let messages: MessageService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
    deletion = TestBed.inject(SaleDeletionService);
    http = TestBed.inject(HttpTestingController);
    messages = TestBed.inject(MessageService);
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('does not send DELETE before confirmation or after cancellation', () => {
    deletion.confirm();
    deletion.request(sale);
    http.expectNone('/api/sales/3');
    deletion.cancel();
    deletion.confirm();
    http.expectNone('/api/sales/3');
    expect(deletion.target()).toBeNull();
  });

  it('sends the selected ID and Accept, blocks duplicates, and updates state only after HTTP 200', () => {
    const notification = vi.spyOn(messages, 'add');
    deletion.request(sale);
    deletion.confirm();
    deletion.confirm();
    deletion.cancel();
    const request = http.expectOne('/api/sales/3');
    expect(request.request.method).toBe('DELETE');
    expect(request.request.body).toBeNull();
    expect(request.request.headers.get('Accept')).toBe('application/json');
    expect(deletion.target()?.id).toBe(3);
    expect(deletion.removedIds().has(3)).toBe(false);
    request.flush({ message: 'Venta eliminada correctamente' });
    expect(deletion.removedIds().has(3)).toBe(true);
    expect(deletion.target()).toBeNull();
    expect(deletion.busy()).toBe(false);
    expect(notification).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Venta eliminada correctamente' }),
    );
  });

  it('treats HTTP 404 as an unavailable sale and updates the list without retrying', () => {
    const notification = vi.spyOn(messages, 'add');
    deletion.request(sale);
    deletion.confirm();
    http
      .expectOne('/api/sales/3')
      .flush({ message: 'Venta no encontrada.' }, { status: 404, statusText: 'Not Found' });
    expect(deletion.removedIds().has(3)).toBe(true);
    expect(deletion.target()).toBeNull();
    expect(notification).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'warn', summary: 'Venta no encontrada.' }),
    );
    deletion.confirm();
    http.expectNone('/api/sales/3');
  });

  it('preserves the sale on server failure, hides traces and requires checking before retry', () => {
    deletion.request(sale);
    deletion.confirm();
    http
      .expectOne('/api/sales/3')
      .flush({ message: 'private stack trace' }, { status: 500, statusText: 'Server Error' });
    expect(deletion.removedIds().has(3)).toBe(false);
    expect(deletion.error()).not.toContain('private stack trace');
    expect(deletion.uncertain()).toBe(true);
    deletion.confirm();
    http.expectNone('/api/sales/3');
    deletion.checkOutcome();
    http.expectOne('/api/sales').flush([sale]);
    expect(deletion.uncertain()).toBe(false);
    expect(deletion.target()?.id).toBe(3);
    http.expectNone('/api/sales/3');
  });

  it('reconciles a lost response by checking the list without another DELETE', () => {
    deletion.request(sale);
    deletion.confirm();
    http.expectOne('/api/sales/3').error(new ProgressEvent('error'));
    expect(deletion.uncertain()).toBe(true);
    expect(deletion.removedIds().has(3)).toBe(false);
    deletion.checkOutcome();
    http.expectOne('/api/sales').flush([]);
    expect(deletion.removedIds().has(3)).toBe(true);
    expect(deletion.target()).toBeNull();
    http.expectNone('/api/sales/3');
  });

  it('does not assume deletion from an invalid response or a failed verification', () => {
    deletion.request(sale);
    deletion.confirm();
    http.expectOne('/api/sales/3').flush({ message: 100 });
    expect(deletion.uncertain()).toBe(true);
    expect(deletion.removedIds().has(3)).toBe(false);
    deletion.checkOutcome();
    http.expectOne('/api/sales').flush({}, { status: 500, statusText: 'Server Error' });
    expect(deletion.uncertain()).toBe(true);
    expect(deletion.busy()).toBe(false);
    expect(deletion.error()).toContain('No se pudo comprobar');
  });

  it('times out without retrying or removing the sale optimistically', () => {
    vi.useFakeTimers();
    deletion.request(sale);
    deletion.confirm();
    const request = http.expectOne('/api/sales/3');
    vi.advanceTimersByTime(20001);
    expect(request.cancelled).toBe(true);
    expect(deletion.removedIds().has(3)).toBe(false);
    expect(deletion.uncertain()).toBe(true);
    expect(deletion.busy()).toBe(false);
    deletion.confirm();
    http.expectNone('/api/sales/3');
  });
});
