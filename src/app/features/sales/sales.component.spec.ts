import { SaleDeletionService } from './data-access/sale-deletion.service';
import { MessageService } from 'primeng/api';
import { TimeZoneService } from '../../core/date-time/time-zone.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../../core/config/api.config';
import { Sale } from './data-access/sale.model';
import { SalesComponent } from './sales.component';
import { salesTotal } from './sales.utils';

const sales: Sale[] = [
  { id: 1, user_id: 1, total: '0.10', created_at: null, details: [] },
  {
    id: 5,
    user_id: 1,
    total: '2240.00',
    created_at: '2026-10-29T00:58:07.000Z',
    details: [
      {
        product_id: 6,
        product: 'Webcam HD 1080p',
        image: 'https://example.com/webcam.png',
        price: '280.00',
        quantity: 2,
        subtotal: '560.00',
      },
      {
        product_id: 8,
        product: 'Memoria RAM 16GB DDR4',
        image: null,
        price: '560.00',
        quantity: 3,
        subtotal: '1680.00',
      },
    ],
  },
];

describe('Sales API integration', () => {
  let fixture: ComponentFixture<SalesComponent>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesComponent],
      providers: [
        MessageService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SalesComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
  });

  it('requests only the sales list and displays actual totals, dates and units', async () => {
    expect(fixture.nativeElement.textContent).toContain('Cargando ventas');
    const request = http.expectOne('/api/sales');
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.get('Accept')).toBe('application/json');
    request.flush(sales);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.sales().map((sale) => sale.id)).toEqual([5, 1]);
    expect(fixture.componentInstance.total()).toBe(2240.1);
    expect(page.textContent).toContain('2,240.00');
    expect(page.textContent).toContain('20:58');
    expect(page.textContent).toContain('5 unidades');
    expect(page.textContent).toContain('Sin fecha');
    http.expectNone('/api/products');
  });

  it('opens existing details without another HTTP call and closes the dialog', async () => {
    http.expectOne('/api/sales').flush(sales);
    await fixture.whenStable();
    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Ver detalle de venta #5"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('Webcam HD 1080p');
    expect(dialog?.textContent).toContain('280.00');
    expect(dialog?.textContent).toContain('560.00');
    expect(dialog?.textContent).toContain('1,680.00');
    expect(dialog?.textContent).toContain('2,240.00');
    expect(
      dialog?.querySelector('[aria-label="Imagen no disponible de Memoria RAM 16GB DDR4"]'),
    ).not.toBeNull();
    dialog?.querySelector('img')?.dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(
      dialog?.querySelector('[aria-label="Imagen no disponible de Webcam HD 1080p"]'),
    ).not.toBeNull();
    http.expectNone('/api/sales/5');
    (dialog?.querySelector('button') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.selectedSale()).toBeNull();
  }, 15000);

  it('updates the list and open detail when the global time zone changes, without refetching', async () => {
    http.expectOne('/api/sales').flush(sales);
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    (
      page.querySelector('button[aria-label="Ver detalle de venta #5"]') as HTMLButtonElement
    ).click();
    await fixture.whenStable();
    const timeZone = TestBed.inject(TimeZoneService);
    timeZone.select('America/Lima');
    await fixture.whenStable();
    expect(page.textContent).toContain('19:58');
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('19:58');
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Perú');
    timeZone.select('America/Argentina/Buenos_Aires');
    await fixture.whenStable();
    expect(page.textContent).toContain('21:58');
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('21:58');
    http.expectNone('/api/sales');
  }, 15000);

  it('shows an empty state without inventing sales', async () => {
    http.expectOne('/api/sales').flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No hay ventas registradas');
    expect(fixture.componentInstance.total()).toBe(0);
  });

  it('shows a safe error and supports manual retry', async () => {
    http
      .expectOne('/api/sales')
      .flush({ message: 'private stack trace' }, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudieron cargar las ventas',
    );
    expect(page.textContent).not.toContain('private stack trace');
    http.expectNone('/api/sales');
    (page.querySelector('p-button button') as HTMLButtonElement).click();
    fixture.detectChanges();
    http.expectOne('/api/sales').flush(sales);
    await fixture.whenStable();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.componentInstance.sales()).toHaveLength(2);
  });

  it('removes a confirmed deletion from the list and recalculates the summary without a stock request', async () => {
    http.expectOne('/api/sales').flush(sales);
    await fixture.whenStable();
    const deletion = TestBed.inject(SaleDeletionService);
    deletion.request(sales[1]);
    deletion.confirm();
    expect(fixture.componentInstance.sales()).toHaveLength(2);
    http.expectOne('/api/sales/5').flush({ message: 'Venta eliminada correctamente' });
    await fixture.whenStable();
    expect(fixture.componentInstance.sales().map((sale) => sale.id)).toEqual([1]);
    expect(fixture.componentInstance.total()).toBe(0.1);
    http.expectNone('/api/products');
  });

  it('cancels a pending request when leaving the page', () => {
    const request = http.expectOne('/api/sales');
    fixture.destroy();
    expect(request.cancelled).toBe(true);
  });
});

describe('Sales formatting', () => {
  it('adds decimal totals using integer cents', () => {
    expect(
      salesTotal([
        { ...sales[0], total: '0.10' },
        { ...sales[0], total: '0.20' },
      ]),
    ).toBe(0.3);
  });
});
