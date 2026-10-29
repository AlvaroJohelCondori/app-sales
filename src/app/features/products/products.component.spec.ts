import { CartService } from '../cart/cart.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { ProductsComponent } from './products.component';
import { Product } from './data-access/product.model';

const products: Product[] = [
  { id: 2, name: 'Teclado', price: '150.53', stock: 5, image: null },
  { id: 1, name: 'Laptop', price: '7500.00', stock: 0, image: 'https://example.com/laptop.png' },
];

describe('Products API integration', () => {
  let fixture: ComponentFixture<ProductsComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductsComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('loads the direct array, sends Accept and displays real prices, stock and sorted names', async () => {
    expect(fixture.nativeElement.textContent).toContain('Cargando productos');
    const request = http.expectOne('/api/products');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Accept')).toBe('application/json');
    request.flush(products);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.totalStock()).toBe(5);
    expect(Array.from(page.querySelectorAll('h3')).map((el) => el.textContent?.trim())).toEqual([
      'Laptop',
      'Teclado',
    ]);
    expect(page.textContent).toContain('150.53');
    expect(page.textContent).toContain('Sin stock');
    expect(page.querySelectorAll('p-card')).toHaveLength(2);
  });

  it('shows the empty state for an empty catalog', async () => {
    http.expectOne('/api/products').flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No hay productos disponibles');
    expect(fixture.componentInstance.totalStock()).toBe(0);
  });

  it('shows a safe error and retries only when requested by the user', async () => {
    http
      .expectOne('/api/products')
      .flush({ message: 'Internal stack trace' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('No se pudieron cargar');
    expect(page.textContent).not.toContain('Internal stack trace');
    http.expectNone('/api/products');
    (page.querySelector('p-button button') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne('/api/products').flush(products);
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(page.querySelectorAll('p-card')).toHaveLength(2);
  });

  it('replaces missing and broken images with an accessible placeholder', async () => {
    http.expectOne('/api/products').flush(products);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[aria-label="Imagen no disponible de Teclado"]')).not.toBeNull();
    page.querySelector('img')?.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(page.querySelector('img')).toBeNull();
    expect(page.querySelector('[aria-label="Imagen no disponible de Laptop"]')).not.toBeNull();
  });

  it('refreshes after a confirmed sale without treating refresh failure as failed creation', async () => {
    http.expectOne('/api/products').flush(products);
    await fixture.whenStable();
    const cart = TestBed.inject(CartService);
    cart.add(products[0]);
    cart.submit();
    http
      .expectOne('/api/sales')
      .flush(
        { message: 'Venta creada correctamente', sale_id: 20, total: '150.53' },
        { status: 201, statusText: 'Created' },
      );
    http.expectOne('/api/products').flush({}, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(cart.lastSale()?.sale_id).toBe(20);
    expect(cart.lines()).toHaveLength(0);
    expect(fixture.componentInstance.error()).not.toBeNull();
    cart.submit();
    http.expectNone('/api/sales');
  });

  it('cancels the pending request when leaving the page', () => {
    const request = http.expectOne('/api/products');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
});
