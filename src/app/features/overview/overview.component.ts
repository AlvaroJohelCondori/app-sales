import { Component, DestroyRef, computed, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, finalize, timeout } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressBarModule } from 'primeng/progressbar';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faArrowTrendUp,
  faBoxesStacked,
  faReceipt,
  faCubesStacked,
} from '@fortawesome/free-solid-svg-icons';
import { ProductsService } from '../products/data-access/products.service';
import { Product } from '../products/data-access/product.model';
import { SalesService } from '../sales/data-access/sales.service';
import { Sale } from '../sales/data-access/sale.model';
import { SaleDeletionService } from '../sales/data-access/sale-deletion.service';
import { SalesUpdatesService } from '../../core/events/sales-updates.service';
import { TimeZoneService } from '../../core/date-time/time-zone.service';
import { buildOverview } from './overview.utils';

@Component({
  selector: 'app-overview',
  imports: [
    DecimalPipe,
    RouterLink,
    ButtonModule,
    MessageModule,
    SkeletonModule,
    ProgressBarModule,
    FontAwesomeModule,
  ],
  templateUrl: './overview.component.html',
})
export class OverviewComponent implements OnInit {
  private readonly productsApi = inject(ProductsService);
  private readonly salesApi = inject(SalesService);
  private readonly deletion = inject(SaleDeletionService);
  private readonly updates = inject(SalesUpdatesService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly products = signal<Product[]>([]);
  private readonly sales = signal<Sale[]>([]);
  private refreshPending = false;
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly dateTime = inject(TimeZoneService);
  readonly icons = [faArrowTrendUp, faReceipt, faCubesStacked, faBoxesStacked];
  readonly report = computed(() =>
    buildOverview(
      this.products(),
      this.sales().filter((sale) => !this.deletion.removedIds().has(sale.id)),
    ),
  );
  readonly saleCount = computed(
    () => this.sales().filter((sale) => !this.deletion.removedIds().has(sale.id)).length,
  );
  readonly metrics = computed(() => [
    {
      label: 'Importe vendido',
      value: this.report().revenue,
      decimals: '1.2-2',
      hint: 'Total del historial disponible',
    },
    {
      label: 'Ventas registradas',
      value: this.saleCount(),
      decimals: '1.0-0',
      hint: 'Operaciones en el historial',
    },
    {
      label: 'Unidades vendidas',
      value: this.report().units,
      decimals: '1.0-0',
      hint: 'Productos en esas ventas',
    },
    {
      label: 'Stock disponible',
      value: this.report().stock,
      decimals: '1.0-0',
      hint: 'Unidades del catálogo actual',
    },
  ]);
  readonly highlights = computed(() => [
    {
      label: 'Más vendido',
      product: this.report().top,
      value: this.report().top?.unitsSold,
      unit: 'uds. vendidas',
    },
    {
      label: 'Menos vendido',
      product: this.report().least,
      value: this.report().least?.unitsSold,
      unit: 'uds. vendidas',
    },
    {
      label: 'Mayor stock',
      product: this.report().highestStock,
      value: this.report().highestStock?.stock,
      unit: 'uds. disponibles',
    },
    {
      label: 'Menor stock',
      product: this.report().lowestStock,
      value: this.report().lowestStock?.stock,
      unit: 'uds. disponibles',
    },
  ]);

  ngOnInit(): void {
    this.loading.set(false);
    this.updates.created$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.load();
  }

  load(): void {
    if (this.loading()) {
      this.refreshPending = true;
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    forkJoin({ products: this.productsApi.list(), sales: this.salesApi.list() })
      .pipe(
        timeout(15000),
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          if (this.refreshPending && !this.destroyRef.destroyed) {
            this.refreshPending = false;
            this.load();
          }
        }),
      )
      .subscribe({
        next: ({ products, sales }) => {
          this.products.set(products);
          this.sales.set(sales);
        },
        error: () => this.error.set(true),
      });
  }
}
