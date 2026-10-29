import { SalesService } from './features/sales/data-access/sales.service';
import { of } from 'rxjs';
import { ProductsService } from './features/products/data-access/products.service';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppComponent } from './app.component';
import { appConfig } from './app.config';

describe('Dashboard navigation', () => {
  it('navigates between products and sales while retaining the shared layout', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        ...appConfig.providers,
        { provide: ProductsService, useValue: { list: () => of([]) } },
        { provide: SalesService, useValue: { list: () => of([]) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    await fixture.whenStable();
    expect(router.url).toBe('/resumen');
    const page = fixture.nativeElement as HTMLElement;
    const nav = page.querySelector('nav');
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Resumen');
    expect(page.querySelectorAll('nav a')).toHaveLength(3);
    (page.querySelector('nav a[href="/ventas"]') as HTMLAnchorElement).click();
    await fixture.whenStable();
    expect(router.url).toBe('/ventas');
    expect(page.querySelector('h1')?.textContent?.trim()).toBe('Ventas');
    expect(page.textContent).toContain('No hay ventas registradas');
    expect(page.querySelector('nav')).toBe(nav);
    expect(page.querySelector('a[aria-current="page"]')?.textContent).toContain('Ventas');
  }, 15000);

  it('redirects unknown paths to overview', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        ...appConfig.providers,
        { provide: ProductsService, useValue: { list: () => of([]) } },
        { provide: SalesService, useValue: { list: () => of([]) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/ruta-inexistente');
    await fixture.whenStable();
    expect(router.url).toBe('/resumen');
    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe('Resumen');
  });
});
