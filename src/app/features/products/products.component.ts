import { CartService } from '../cart/cart.service';
import { SalesUpdatesService } from '../../core/events/sales-updates.service';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { Product } from './data-access/product.model';
import { ProductsService } from './data-access/products.service';

@Component({
  selector: 'app-products',
  imports: [
    ButtonModule,
    CardModule,
    MessageModule,
    SkeletonModule,
    ProductCardComponent,
    FontAwesomeModule,
    DecimalPipe,
  ],
  templateUrl: './products.component.html',
})
export class ProductsComponent implements OnInit {
  private readonly cart = inject(CartService);
  private readonly api = inject(ProductsService);
  private readonly updates = inject(SalesUpdatesService);
  private refreshPending = false;
  private readonly destroyRef = inject(DestroyRef);
  private readonly productState = signal<Product[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly products = this.productState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly totalStock = computed(() =>
    this.products().reduce((total, product) => total + product.stock, 0),
  );
  readonly placeholderIcon = faBoxOpen;
  readonly skeletons = [1, 2, 3];

  ngOnInit(): void {
    this.updates.created$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadProducts());
    this.loadProducts();
  }

  loadProducts(): void {
    if (this.loading()) {
      this.refreshPending = true;
      return;
    }
    this.loadingState.set(true);
    this.errorState.set(null);
    this.api
      .list()
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loadingState.set(false);
          if (this.refreshPending && !this.destroyRef.destroyed) {
            this.refreshPending = false;
            this.loadProducts();
          }
        }),
      )
      .subscribe({
        next: (products) => {
          this.cart.syncCatalog(products);
          this.productState.set([...products].sort((a, b) => a.name.localeCompare(b.name, 'es')));
        },
        error: (error: unknown) => {
          this.errorState.set(
            error instanceof HttpErrorResponse && error.status === 0
              ? 'No se pudo conectar con el servicio de productos. Comprueba tu conexión e inténtalo de nuevo.'
              : 'No se pudieron cargar los productos. Inténtalo de nuevo en unos momentos.',
          );
        },
      });
  }
}
