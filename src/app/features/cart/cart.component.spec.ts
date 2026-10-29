import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { API_BASE_URL } from '../../core/config/api.config';
import { CartComponent } from './cart.component';
import { CartService } from './cart.service';

it('announces invalid quantities and disables confirmation until local and server errors are corrected', async () => {
  await TestBed.configureTestingModule({
    imports: [CartComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      MessageService,
      { provide: API_BASE_URL, useValue: '/api' },
    ],
  }).compileComponents();
  const cart = TestBed.inject(CartService);
  const http = TestBed.inject(HttpTestingController);
  cart.add({ id: 6, name: 'Webcam', price: '280.00', stock: 10, image: null });
  cart.visible.set(true);
  const fixture = TestBed.createComponent(CartComponent);
  await fixture.whenStable();
  const input = document.querySelector('#quantity-6') as HTMLInputElement;
  const submit = document.querySelector('.p-drawer-footer button') as HTMLButtonElement;
  input.value = '0';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(input.getAttribute('aria-describedby')).toContain('quantity-errors-6');
  expect(document.querySelector('#quantity-errors-6')?.textContent).toContain('mínima es 1');
  expect(submit.disabled).toBe(true);
  cart.submit();
  http.expectNone('/api/sales');
  input.value = '2';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();
  expect(submit.disabled).toBe(false);
  submit.click();
  http
    .expectOne('/api/sales')
    .flush(
      { errors: { 'items.0.quantity': ['Stock insuficiente'] } },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
  await fixture.whenStable();
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(submit.disabled).toBe(true);
  input.value = '3';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();
  expect(input.getAttribute('aria-invalid')).toBe('false');
  expect(submit.disabled).toBe(false);
  fixture.destroy();
  http.verify();
}, 15000);
