import { SaleDeletionService } from './data-access/sale-deletion.service';
import { SaleDeleteDialogComponent } from './components/sale-delete-dialog/sale-delete-dialog.component';
import { SalesUpdatesService } from '../../core/events/sales-updates.service';
import { TimeZoneService } from '../../core/date-time/time-zone.service';
import { Component, computed, effect, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faReceipt, faTrashCan } from '@fortawesome/free-solid-svg-icons';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { Sale } from './data-access/sale.model';
import { SalesService } from './data-access/sales.service';
import { SaleDetailsComponent } from './components/sale-details/sale-details.component';
import { salesTotal, saleUnits } from './sales.utils';

@Component({
  selector: 'app-sales',
  imports: [
    DecimalPipe,
    FontAwesomeModule,
    ButtonModule,
    MessageModule,
    SkeletonModule,
    TableModule,
    SaleDetailsComponent,
    SaleDeleteDialogComponent,
  ],
  templateUrl: './sales.component.html',
})
export class SalesComponent implements OnInit {
  private readonly api = inject(SalesService);
  private readonly updates = inject(SalesUpdatesService);
  private refreshPending = false;
  private readonly destroyRef = inject(DestroyRef);
  private readonly salesState = signal<Sale[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  readonly deletion = inject(SaleDeletionService);
  readonly sales = computed(() =>
    this.salesState().filter((sale) => !this.deletion.removedIds().has(sale.id)),
  );
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly total = computed(() => salesTotal(this.sales()));
  readonly selectedSale = signal<Sale | null>(null);
  readonly receiptIcon = faReceipt;
  readonly deleteIcon = faTrashCan;
  readonly skeletons = [1, 2, 3];
  readonly dateTime = inject(TimeZoneService);
  readonly units = saleUnits;

  constructor() {
    effect(() => {
      const selected = this.selectedSale();
      if (selected && this.deletion.removedIds().has(selected.id)) this.selectedSale.set(null);
    });
  }

  ngOnInit(): void {
    this.updates.created$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadSales());
    this.loadSales();
  }

  loadSales(): void {
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
            this.loadSales();
          }
        }),
      )
      .subscribe({
        next: (sales) => this.salesState.set([...sales].sort((a, b) => b.id - a.id)),
        error: (error: unknown) =>
          this.errorState.set(
            error instanceof HttpErrorResponse && error.status === 0
              ? 'No se pudo conectar con el servicio de ventas. Comprueba tu conexión e inténtalo de nuevo.'
              : 'No se pudieron cargar las ventas. Inténtalo de nuevo en unos momentos.',
          ),
      });
  }
}
