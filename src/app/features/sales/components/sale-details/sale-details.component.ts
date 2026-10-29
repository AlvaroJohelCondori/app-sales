import { TimeZoneService } from '../../../../core/date-time/time-zone.service';
import { Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { DOCUMENT, DecimalPipe } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBoxOpen } from '@fortawesome/free-solid-svg-icons';
import { DialogModule } from 'primeng/dialog';
import { Sale, SaleDetail } from '../../data-access/sale.model';

@Component({
  selector: 'app-sale-details',
  imports: [DecimalPipe, FontAwesomeModule, DialogModule],
  templateUrl: './sale-details.component.html',
})
export class SaleDetailsComponent {
  readonly sale = input.required<Sale>();
  readonly closed = output<void>();
  readonly placeholderIcon = faBoxOpen;
  readonly dateTime = inject(TimeZoneService);
  private readonly failedImages = signal(new Set<number>());

  constructor() {
    const opener = inject(DOCUMENT).activeElement;
    inject(DestroyRef).onDestroy(() => {
      queueMicrotask(() => {
        if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      });
    });
  }

  hasImage(detail: SaleDetail): boolean {
    return !!detail.image && !this.failedImages().has(detail.product_id);
  }

  onImageError(id: number): void {
    this.failedImages.update((ids) => new Set([...ids, id]));
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) this.closed.emit();
  }
}
