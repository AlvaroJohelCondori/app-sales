import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, timeout } from 'rxjs';
import { Product } from '../products/data-access/product.model';
import { CreateSaleResult } from '../sales/data-access/sale.model';
import { SalesService } from '../sales/data-access/sales.service';
import { SalesUpdatesService } from '../../core/events/sales-updates.service';
import {
  isCreateSaleResult,
  isRecord,
  MAX_QUANTITY,
  MAX_TOTAL_CENTS,
  priceCents,
  productError,
  validateQuantity,
} from './cart.validation';

export interface CartLine {
  product: Product;
  quantity: number;
}
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly api = inject(SalesService);
  private readonly updates = inject(SalesUpdatesService);
  private readonly lineState = signal<CartLine[]>([]);
  private readonly sendingState = signal(false);
  private readonly errorState = signal<string | null>(null);
  private readonly reviewState = signal(false);
  private readonly fieldErrors = signal<Partial<Record<number, string[]>>>({});
  private readonly drafts = signal<Partial<Record<number, string>>>({});
  private readonly generalErrors = signal<string[]>([]);
  readonly formErrors = this.generalErrors.asReadonly();
  private readonly successState = signal<CreateSaleResult | null>(null);
  readonly lines = this.lineState.asReadonly();
  readonly submitting = this.sendingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly requiresReview = this.reviewState.asReadonly();
  readonly lineErrors = this.fieldErrors.asReadonly();
  readonly lastSale = this.successState.asReadonly();
  readonly visible = signal(false);
  readonly locked = computed(() => this.submitting() || this.requiresReview());
  readonly quantity = computed(() => this.lines().reduce((sum, line) => sum + line.quantity, 0));
  private readonly totalCents = computed(() => {
    let total = 0n;
    for (const line of this.lines()) {
      const price = priceCents(line.product.price);
      if (price === null) return null;
      total += price * BigInt(line.quantity);
    }
    return total;
  });
  readonly totalExceeded = computed(() => {
    const total = this.totalCents();
    return total !== null && total > MAX_TOTAL_CENTS;
  });
  readonly estimatedTotal = computed(() => {
    const total = this.totalCents();
    return total !== null &&
      !this.totalExceeded() &&
      this.lines().every((line) => !this.quantityError(line))
      ? Number(total) / 100
      : null;
  });
  readonly validationMessage = computed(() => {
    if (this.lines().some((line) => !!this.quantityError(line)))
      return 'Corrige los campos marcados antes de confirmar.';
    if (this.totalExceeded())
      return 'El total no puede superar 99,999,999.99. Reduce las cantidades o retira productos.';
    if (
      this.generalErrors().length ||
      Object.values(this.lineErrors()).some((errors) => errors?.length)
    )
      return 'Corrige los datos indicados por el servidor antes de confirmar nuevamente.';
    return null;
  });
  readonly canSubmit = computed(
    () =>
      !this.locked() &&
      this.lines().length > 0 &&
      !this.validationMessage() &&
      this.estimatedTotal() !== null,
  );

  count(id: number): number {
    return this.lines().find((line) => line.product.id === id)?.quantity ?? 0;
  }
  maxQuantity(product: Product): number {
    return Number.isSafeInteger(product.stock) && product.stock > 0
      ? Math.min(product.stock, MAX_QUANTITY)
      : 0;
  }
  canAdd(product: Product): boolean {
    const line = this.lines().find((item) => item.product.id === product.id);
    return (
      !this.locked() &&
      !productError(product) &&
      (!line || !this.quantityError(line)) &&
      this.count(product.id) < this.maxQuantity(product)
    );
  }

  add(product: Product): void {
    if (!this.canAdd(product)) return;
    this.clearFeedback(product.id);
    this.lineState.update((lines) => {
      const exists = lines.some((line) => line.product.id === product.id);
      return exists
        ? lines.map((line) =>
            line.product.id === product.id ? { product, quantity: line.quantity + 1 } : line,
          )
        : [...lines, { product, quantity: 1 }];
    });
  }

  quantityValue(line: CartLine): string {
    return this.drafts()[line.product.id] ?? String(line.quantity);
  }

  setQuantity(id: number, value: number | string | null): void {
    if (this.locked()) return;
    const line = this.lines().find((item) => item.product.id === id);
    if (!line) return;
    const raw = value === null ? '' : String(value);
    this.drafts.update((drafts) => ({ ...drafts, [id]: raw }));
    if (raw !== String(line.quantity)) this.clearFeedback(id);
    if (validateQuantity(raw, line.product)) return;
    this.lineState.update((lines) =>
      lines.map((item) => (item.product.id === id ? { ...item, quantity: Number(raw) } : item)),
    );
  }

  normalizeQuantity(id: number): void {
    const line = this.lines().find((item) => item.product.id === id);
    if (!line || this.locked() || this.quantityError(line)) return;
    this.drafts.update((drafts) =>
      Object.fromEntries(Object.entries(drafts).filter(([key]) => Number(key) !== id)),
    );
  }

  remove(id: number): void {
    if (this.locked()) return;
    this.clearFeedback(id);
    this.drafts.update((drafts) =>
      Object.fromEntries(Object.entries(drafts).filter(([key]) => Number(key) !== id)),
    );
    this.lineState.update((lines) => lines.filter((line) => line.product.id !== id));
  }

  syncCatalog(products: Product[]): void {
    this.lineState.update((lines) =>
      lines.map((line) => ({
        ...line,
        product: products.find((product) => product.id === line.product.id) ?? {
          ...line.product,
          stock: 0,
        },
      })),
    );
  }

  quantityError(line: CartLine): string | null {
    return validateQuantity(this.quantityValue(line), line.product);
  }

  unitPrice(line: CartLine): number | null {
    const price = priceCents(line.product.price);
    return price !== null && price <= MAX_TOTAL_CENTS ? Number(price) / 100 : null;
  }

  subtotal(line: CartLine): number | null {
    const price = priceCents(line.product.price);
    if (price === null || this.quantityError(line)) return null;
    const cents = price * BigInt(line.quantity);
    return cents <= MAX_TOTAL_CENTS ? Number(cents) / 100 : null;
  }

  acknowledgeReview(): void {
    if (this.submitting()) return;
    this.reviewState.set(false);
    this.errorState.set(null);
  }

  submit(): void {
    if (!this.canSubmit()) return;
    const snapshot = this.lines().map((line) => ({
      product_id: line.product.id,
      quantity: line.quantity,
    }));
    this.sendingState.set(true);
    this.errorState.set(null);
    this.fieldErrors.set({});
    this.generalErrors.set([]);
    this.successState.set(null);
    this.api
      .create({ user_id: 1, items: snapshot })
      .pipe(
        timeout(20000),
        finalize(() => this.sendingState.set(false)),
      )
      .subscribe({
        next: (result) => {
          if (!isCreateSaleResult(result)) {
            this.markUncertain(
              'El servidor respondió, pero no se pudo validar la confirmación. Revisa Ventas antes de volver a enviar.',
            );
            return;
          }
          this.drafts.set({});
          this.successState.set(result);
          this.lineState.set([]);
          this.updates.notifyCreated();
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 422) {
            const body: unknown = error.error;
            const message =
              isRecord(body) && typeof body['message'] === 'string' && body['message'].trim()
                ? body['message']
                : 'Revisa los datos de la venta.';
            this.errorState.set(message);
            const fields = isRecord(body) && isRecord(body['errors']) ? body['errors'] : {};
            const errors: Partial<Record<number, string[]>> = {};
            const general: string[] = [];
            for (const [key, messages] of Object.entries(fields)) {
              if (!Array.isArray(messages)) continue;
              const validMessages = messages.filter(
                (message): message is string => typeof message === 'string' && !!message.trim(),
              );
              const match = /^items\.(\d+)(?:\.|$)/.exec(key);
              const item = match ? snapshot[Number(match[1])] : undefined;
              if (item)
                errors[item.product_id] = [...(errors[item.product_id] ?? []), ...validMessages];
              else general.push(...validMessages);
            }
            this.fieldErrors.set(errors);
            this.generalErrors.set(
              general.length || Object.keys(errors).length
                ? general
                : ['Revisa los productos y las cantidades antes de confirmar nuevamente.'],
            );
          } else if (
            error instanceof HttpErrorResponse &&
            error.status >= 400 &&
            error.status < 500
          ) {
            this.errorState.set(
              error.status === 429
                ? 'Demasiados intentos. Espera unos momentos antes de volver a confirmar.'
                : 'El servicio rechazó la solicitud. No se registró la venta. Inténtalo más tarde.',
            );
          } else {
            this.markUncertain(
              'No se pudo confirmar el resultado del envío. La venta podría haberse registrado. Revisa Ventas antes de volver a enviarla.',
            );
          }
        },
      });
  }

  private markUncertain(message: string): void {
    this.reviewState.set(true);
    this.errorState.set(message);
  }

  private clearFeedback(id: number): void {
    this.generalErrors.set([]);
    this.successState.set(null);
    this.errorState.set(null);
    this.fieldErrors.update((errors) =>
      Object.fromEntries(Object.entries(errors).filter(([key]) => Number(key) !== id)),
    );
  }
}
