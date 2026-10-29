import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Sale } from './sale.model';
import { SalesService } from './sales.service';

function responseMessage(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('message' in value)) return null;
  return typeof value.message === 'string' && value.message.trim() ? value.message : null;
}

@Injectable({ providedIn: 'root' })
export class SaleDeletionService {
  private readonly api = inject(SalesService);
  private readonly messages = inject(MessageService);
  private readonly targetState = signal<Sale | null>(null);
  private readonly deletingState = signal(false);
  private readonly checkingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly uncertainState = signal(false);
  private readonly removedState = signal(new Set<number>());
  readonly target = this.targetState.asReadonly();
  readonly deleting = this.deletingState.asReadonly();
  readonly checking = this.checkingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly uncertain = this.uncertainState.asReadonly();
  readonly removedIds = this.removedState.asReadonly();
  readonly busy = computed(() => this.deleting() || this.checking());

  request(sale: Sale): void {
    if (
      this.busy() ||
      !Number.isSafeInteger(sale.id) ||
      sale.id < 1 ||
      this.removedIds().has(sale.id)
    )
      return;
    this.errorState.set(null);
    this.uncertainState.set(false);
    this.targetState.set(sale);
  }

  cancel(): void {
    if (this.busy()) return;
    this.targetState.set(null);
    this.errorState.set(null);
    this.uncertainState.set(false);
  }

  confirm(): void {
    const sale = this.target();
    if (!sale || this.busy() || this.uncertain()) return;
    this.deletingState.set(true);
    this.errorState.set(null);
    this.api
      .deleteSale(sale.id)
      .pipe(
        timeout(20000),
        finalize(() => this.deletingState.set(false)),
      )
      .subscribe({
        next: (result) => {
          const message = responseMessage(result);
          if (!message) {
            this.markUncertain();
            return;
          }
          this.removeLocally(sale.id);
          this.messages.add({
            severity: 'success',
            summary: message,
            detail: `Venta #${sale.id}`,
            life: 6000,
          });
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 404) {
            this.removeLocally(sale.id);
            this.messages.add({
              severity: 'warn',
              summary: responseMessage(error.error) ?? 'La venta ya no está disponible.',
              detail: 'El listado se ha actualizado.',
              life: 6000,
            });
          } else if (
            error instanceof HttpErrorResponse &&
            error.status >= 400 &&
            error.status < 500
          ) {
            this.errorState.set(
              error.status === 429
                ? 'Demasiados intentos. Espera unos momentos antes de volver a intentar.'
                : 'No fue posible eliminar la venta. El servicio rechazó la solicitud.',
            );
          } else {
            this.markUncertain();
          }
        },
      });
  }

  checkOutcome(): void {
    const sale = this.target();
    if (!sale || this.busy() || !this.uncertain()) return;
    this.checkingState.set(true);
    this.api
      .list()
      .pipe(
        timeout(15000),
        finalize(() => this.checkingState.set(false)),
      )
      .subscribe({
        next: (sales) => {
          const existing = sales.find((item) => item.id === sale.id);
          if (!existing) {
            this.removeLocally(sale.id);
            this.messages.add({
              severity: 'info',
              summary: 'La venta ya no está disponible.',
              detail: 'El listado se ha actualizado.',
              life: 6000,
            });
          } else {
            this.uncertainState.set(false);
            this.errorState.set(
              'La venta sigue en el listado. Puedes volver a intentar eliminarla.',
            );
          }
        },
        error: () =>
          this.errorState.set(
            'No se pudo comprobar el listado. Verifica tu conexión e inténtalo de nuevo.',
          ),
      });
  }

  private markUncertain(): void {
    this.uncertainState.set(true);
    this.errorState.set(
      'No se pudo confirmar la eliminación. Comprueba el listado antes de volver a intentar.',
    );
  }

  private removeLocally(id: number): void {
    this.removedState.update((ids) => new Set([...ids, id]));
    this.targetState.set(null);
    this.errorState.set(null);
    this.uncertainState.set(false);
  }
}
