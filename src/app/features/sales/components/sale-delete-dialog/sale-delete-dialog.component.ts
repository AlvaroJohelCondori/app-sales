import { Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import { DOCUMENT, DecimalPipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SaleDeletionService } from '../../data-access/sale-deletion.service';
import { TimeZoneService } from '../../../../core/date-time/time-zone.service';

@Component({
  selector: 'app-sale-delete-dialog',
  imports: [DecimalPipe, ButtonModule, DialogModule, MessageModule],
  templateUrl: './sale-delete-dialog.component.html',
})
export class SaleDeleteDialogComponent {
  private readonly cancelButton = viewChild<unknown, ElementRef<HTMLElement>>('cancelButton', {
    read: ElementRef,
  });
  readonly deletion = inject(SaleDeletionService);
  readonly dateTime = inject(TimeZoneService);

  constructor() {
    const document = inject(DOCUMENT);
    const opener = document.activeElement;
    inject(DestroyRef).onDestroy(() =>
      queueMicrotask(() => {
        if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
        else document.getElementById('sales-title')?.focus();
      }),
    );
  }

  focusCancel(): void {
    this.cancelButton()?.nativeElement.querySelector<HTMLButtonElement>('button')?.focus();
  }

  onVisibleChange(visible: boolean): void {
    if (!visible) this.deletion.cancel();
  }
}
