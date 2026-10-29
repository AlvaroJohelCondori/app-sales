import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { OverviewComponent } from './overview.component';
import { buildOverview } from './overview.utils';
import { Product } from '../products/data-access/product.model';
import { Sale } from '../sales/data-access/sale.model';
import { API_BASE_URL } from '../../core/config/api.config';
import { SalesUpdatesService } from '../../core/events/sales-updates.service';
import { SaleDeletionService } from '../sales/data-access/sale-deletion.service';

const products: Product[] = [
  { id: 1, name: 'Laptop', price: '10.00', stock: 5, image: null },
  { id: 2, name: 'Mouse', price: '0.10', stock: 0, image: null },
  { id: 3, name: 'Teclado', price: '0.20', stock: 20, image: null },
];
const sales: Sale[] = [
  {
    id: 1,
    user_id: 1,
    total: '0.10',
    created_at: '2026-10-28T00:00:00Z',
    details: [
      {
        product_id: 1,
        product: 'Laptop',
        price: '0.10',
        quantity: 2,
        subtotal: '0.10',
        image: null,
      },
    ],
  },
  {
    id: 2,
    user_id: 1,
    total: '0.20',
    created_at: '2026-10-29T00:00:00Z',
    details: [
      {
        product_id: 1,
        product: 'Laptop',
        price: '0.10',
        quantity: 1,
        subtotal: '0.10',
        image: null,
      },
      {
        product_id: 3,
        product: 'Teclado',
        price: '0.10',
        quantity: 3,
        subtotal: '0.10',
        image: null,
      },
    ],
  },
];

describe('Overview report calculations', () => {
  it('aggregates quantities across sales, includes zero sellers and orders ties by ID', () => {
    const report = buildOverview(products, sales);
    expect(report.revenue).toBe(0.3);
    expect(report.units).toBe(6);
    expect(report.stock).toBe(25);
    expect(report.top?.id).toBe(1);
    expect(report.top?.unitsSold).toBe(3);
    expect(report.least?.id).toBe(2);
    expect(report.least?.unitsSold).toBe(0);
    expect(report.lowestStock?.id).toBe(2);
    expect(report.highestStock?.id).toBe(3);
    expect(report.withoutSales).toBe(1);
    expect(report.recent.map((sale) => sale.id)).toEqual([2, 1]);
  });

  it('does not invent a best seller or products for empty datasets', () => {
    expect(buildOverview([], []).top).toBeNull();
    expect(buildOverview([], []).lowestStock).toBeNull();
    expect(buildOverview(products, []).top).toBeNull();
    expect(buildOverview(products, []).withoutSales).toBe(3);
  });
});

describe('Overview API integration', () => {
  let fixture: ComponentFixture<OverviewComponent>;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverviewComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(OverviewComponent);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  function flushReport() {
    http.expectOne('/api/products').flush(products);
    http.expectOne('/api/sales').flush(sales);
  }

  it('waits for both endpoints and renders real report figures', async () => {
    http.expectOne('/api/products').flush(products);
    expect(fixture.componentInstance.loading()).toBe(true);
    http.expectOne('/api/sales').flush(sales);
    await fixture.whenStable();
    expect(fixture.componentInstance.report().revenue).toBe(0.3);
    expect(fixture.nativeElement.textContent).toContain('Laptop');
    expect(fixture.nativeElement.textContent).toContain('0.30');
  });

  it('shows a safe error instead of partial totals and allows manual refresh', async () => {
    http.expectOne('/api/products').flush(products);
    http
      .expectOne('/api/sales')
      .flush({ trace: 'private error' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No se pudo cargar el resumen completo');
    expect(fixture.nativeElement.textContent).not.toContain('private error');
    fixture.componentInstance.load();
    flushReport();
    await fixture.whenStable();
    expect(fixture.componentInstance.error()).toBe(false);
  });

  it('refreshes after creation and excludes confirmed deleted sales without changing stock', async () => {
    flushReport();
    TestBed.inject(SalesUpdatesService).notifyCreated();
    flushReport();
    const deletion = TestBed.inject(SaleDeletionService);
    deletion.request(sales[0]);
    deletion.confirm();
    http.expectOne('/api/sales/1').flush({ message: 'Venta eliminada correctamente' });
    await fixture.whenStable();
    expect(fixture.componentInstance.saleCount()).toBe(1);
    expect(fixture.componentInstance.report().revenue).toBe(0.2);
    expect(fixture.componentInstance.report().stock).toBe(25);
  });

  it('cancels pending reads when leaving the page', () => {
    const pending = [http.expectOne('/api/products'), http.expectOne('/api/sales')];
    fixture.destroy();
    expect(pending.every((request) => request.cancelled)).toBe(true);
  });
});
