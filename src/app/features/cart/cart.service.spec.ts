import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { API_BASE_URL } from '../../core/config/api.config';
import { SalesUpdatesService } from '../../core/events/sales-updates.service';
import { Product } from '../products/data-access/product.model';
import { CartService } from './cart.service';

const webcam: Product = { id: 6, name: 'Webcam', price: '280.00', stock: 10, image: null };
const memory: Product = { id: 8, name: 'Memoria', price: '560.00', stock: 20, image: null };

describe('CartService', () => {
  let cart: CartService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    });
    cart = TestBed.inject(CartService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('merges repeated products and validates integer quantities against stock', () => {
    cart.add(webcam);
    cart.add(webcam);
    expect(cart.lines()).toHaveLength(1);
    expect(cart.count(6)).toBe(2);
    cart.setQuantity(6, 1.5);
    cart.setQuantity(6, 0);
    cart.setQuantity(6, 11);
    expect(cart.count(6)).toBe(2);
    cart.add({ ...memory, stock: 0 });
    expect(cart.lines()).toHaveLength(1);
    cart.setQuantity(6, 10);
    cart.add(webcam);
    expect(cart.count(6)).toBe(10);
  });

  it('computes money in integer cents and prevents totals above the backend limit', () => {
    cart.add({ ...webcam, price: '0.10' });
    cart.add({ ...memory, price: '0.20' });
    expect(cart.estimatedTotal()).toBe(0.3);
    cart.remove(8);
    cart.remove(6);
    cart.add({ ...webcam, price: '99999999.99' });
    cart.add({ ...webcam, price: '99999999.99' });
    expect(cart.estimatedTotal()).toBeNull();
    expect(cart.canSubmit()).toBe(false);
    cart.submit();
    http.expectNone('/api/sales');
  });

  it('sends only IDs and quantities with user 1, blocks duplicate submissions, and clears only after success', () => {
    const updated = vi.fn();
    TestBed.inject(SalesUpdatesService).created$.subscribe(updated);
    cart.add(webcam);
    cart.setQuantity(6, 2);
    cart.add(memory);
    cart.setQuantity(8, 3);
    cart.submit();
    cart.submit();
    cart.remove(6);
    cart.setQuantity(8, 1);
    cart.add(memory);
    const request = http.expectOne('/api/sales');
    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('Accept')).toBe('application/json');
    expect(request.request.headers.get('Content-Type')).toBe('application/json');
    expect(request.request.body).toEqual({
      user_id: 1,
      items: [
        { product_id: 6, quantity: 2 },
        { product_id: 8, quantity: 3 },
      ],
    });
    expect(cart.lines()).toHaveLength(2);
    expect(cart.submitting()).toBe(true);
    request.flush(
      { message: 'Venta creada correctamente', sale_id: 9, total: '2240.00' },
      { status: 201, statusText: 'Created' },
    );
    expect(cart.lines()).toHaveLength(0);
    expect(cart.submitting()).toBe(false);
    expect(cart.lastSale()?.sale_id).toBe(9);
    expect(cart.lastSale()?.message).toBe('Venta creada correctamente');
    expect(updated).toHaveBeenCalledTimes(1);
    cart.submit();
    http.expectNone('/api/sales');
  });

  it('preserves the cart and maps validation errors by the submitted order', () => {
    cart.add(memory);
    cart.add(webcam);
    cart.submit();
    http.expectOne('/api/sales').flush(
      {
        message: 'Stock insuficiente',
        errors: { 'items.1.product_id': ['Sin stock suficiente'] },
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(cart.lines()).toHaveLength(2);
    expect(cart.lineErrors()[6]).toEqual(['Sin stock suficiente']);
    expect(cart.lineErrors()[8]).toBeUndefined();
    expect(cart.lastSale()).toBeNull();
    expect(cart.requiresReview()).toBe(false);
    cart.setQuantity(6, 2);
    expect(cart.lineErrors()[6]).toBeUndefined();
  });

  it('does not retry an uncertain network result until the user acknowledges reviewing sales', () => {
    cart.add(webcam);
    cart.submit();
    http.expectOne('/api/sales').error(new ProgressEvent('error'));
    expect(cart.requiresReview()).toBe(true);
    expect(cart.lines()).toHaveLength(1);
    cart.submit();
    http.expectNone('/api/sales');
    cart.acknowledgeReview();
    cart.submit();
    http
      .expectOne('/api/sales')
      .flush(
        { message: 'Venta creada correctamente', sale_id: 10, total: '280.00' },
        { status: 201, statusText: 'Created' },
      );
    expect(cart.lastSale()?.sale_id).toBe(10);
  });

  it('keeps server failures separate from successful creation without exposing internal traces', () => {
    cart.add(webcam);
    cart.submit();
    http
      .expectOne('/api/sales')
      .flush({ message: 'private stack trace' }, { status: 500, statusText: 'Server Error' });
    expect(cart.error()).not.toContain('private stack trace');
    expect(cart.lastSale()).toBeNull();
    expect(cart.lines()).toHaveLength(1);
    expect(cart.requiresReview()).toBe(true);
  });

  it('times out without automatically resending a possibly registered sale', () => {
    vi.useFakeTimers();
    cart.add(webcam);
    cart.submit();
    const request = http.expectOne('/api/sales');
    vi.advanceTimersByTime(20001);
    expect(request.cancelled).toBe(true);
    expect(cart.requiresReview()).toBe(true);
    expect(cart.submitting()).toBe(false);
    cart.submit();
    http.expectNone('/api/sales');
  });

  it('revalidates selected products against an updated catalog', () => {
    cart.add(webcam);
    cart.setQuantity(6, 5);
    cart.syncCatalog([{ ...webcam, stock: 2, price: '290.00' }]);
    expect(cart.count(6)).toBe(5);
    expect(cart.canSubmit()).toBe(false);
    expect(cart.quantityError(cart.lines()[0])).toContain('2 unidades');
    cart.setQuantity(6, 2);
    expect(cart.estimatedTotal()).toBe(580);
    cart.syncCatalog([]);
    expect(cart.canSubmit()).toBe(false);
  });
  it('keeps invalid drafts visible and prevents submitting the last valid quantity by mistake', () => {
    cart.add(webcam);
    for (const value of ['', '0', '-1', '1.5', '1e2', 'abc', '11', '2147483648']) {
      cart.setQuantity(6, value);
      expect(cart.quantityValue(cart.lines()[0])).toBe(value);
      expect(cart.quantityError(cart.lines()[0])).not.toBeNull();
      expect(cart.canSubmit()).toBe(false);
      expect(cart.estimatedTotal()).toBeNull();
      cart.submit();
      http.expectNone('/api/sales');
    }
    cart.setQuantity(6, '02');
    cart.normalizeQuantity(6);
    expect(cart.quantityValue(cart.lines()[0])).toBe('2');
    expect(cart.canSubmit()).toBe(true);
    expect(cart.estimatedTotal()).toBe(560);
  });

  it('retains unresolved server errors when another product is removed or the value is unchanged', () => {
    cart.add(memory);
    cart.add(webcam);
    cart.submit();
    http
      .expectOne('/api/sales')
      .flush(
        { errors: { 'items.1.quantity': ['Revisa esta cantidad'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    expect(cart.canSubmit()).toBe(false);
    cart.remove(8);
    cart.setQuantity(6, 1);
    expect(cart.lineErrors()[6]).toEqual(['Revisa esta cantidad']);
    expect(cart.canSubmit()).toBe(false);
    cart.setQuantity(6, 2);
    expect(cart.canSubmit()).toBe(true);
  });

  it('displays general validation errors instead of dropping unrecognized field paths', () => {
    cart.add(webcam);
    cart.submit();
    http
      .expectOne('/api/sales')
      .flush(
        { errors: { items: ['El carrito no es válido'], user_id: ['Usuario no permitido'] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    expect(cart.formErrors()).toEqual(['El carrito no es válido', 'Usuario no permitido']);
    expect(cart.canSubmit()).toBe(false);
    cart.setQuantity(6, 2);
    expect(cart.formErrors()).toEqual([]);
  });

  it('does not crash on malformed validation responses', () => {
    cart.add(webcam);
    cart.submit();
    expect(() =>
      http
        .expectOne('/api/sales')
        .flush(
          { message: 10, errors: ['unexpected'] },
          { status: 422, statusText: 'Unprocessable Entity' },
        ),
    ).not.toThrow();
    expect(cart.error()).toBe('Revisa los datos de la venta.');
    expect(cart.formErrors()).toHaveLength(1);
    expect(cart.canSubmit()).toBe(false);
  });

  it('does not clear the cart or emit success for an invalid success response', () => {
    const created = vi.fn();
    TestBed.inject(SalesUpdatesService).created$.subscribe(created);
    cart.add(webcam);
    cart.submit();
    http
      .expectOne('/api/sales')
      .flush(
        { message: 'Venta creada', sale_id: '10', total: '280.00' },
        { status: 201, statusText: 'Created' },
      );
    expect(cart.lastSale()).toBeNull();
    expect(cart.lines()).toHaveLength(1);
    expect(cart.requiresReview()).toBe(true);
    expect(created).not.toHaveBeenCalled();
    cart.submit();
    http.expectNone('/api/sales');
  });

  it('rejects invalid product data and does not throw when a catalog price becomes invalid', () => {
    cart.add({ ...webcam, id: 0 });
    cart.add({ ...webcam, stock: -1 });
    cart.add({ ...webcam, price: 'invalid' });
    expect(cart.lines()).toHaveLength(0);
    cart.add(webcam);
    cart.syncCatalog([{ ...webcam, price: 'invalid' }]);
    expect(() => cart.estimatedTotal()).not.toThrow();
    expect(cart.unitPrice(cart.lines()[0])).toBeNull();
    expect(cart.subtotal(cart.lines()[0])).toBeNull();
    expect(cart.canSubmit()).toBe(false);
  });

  it('distinguishes an explicit client rejection from an uncertain server outcome', () => {
    cart.add(webcam);
    cart.submit();
    http
      .expectOne('/api/sales')
      .flush({ message: 'private trace' }, { status: 403, statusText: 'Forbidden' });
    expect(cart.requiresReview()).toBe(false);
    expect(cart.lastSale()).toBeNull();
    expect(cart.error()).not.toContain('private trace');
    expect(cart.lines()).toHaveLength(1);
  });
});
