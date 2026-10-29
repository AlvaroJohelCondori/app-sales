import { Component, effect, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faCartShopping,
  faTrashCan,
  faCheck,
  faMinus,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { CartService } from './cart.service';

@Component({
  selector: 'app-cart',
  imports: [
    DecimalPipe,
    RouterLink,
    FontAwesomeModule,
    ButtonModule,
    DrawerModule,
    InputTextModule,
    MessageModule,
    ToastModule,
  ],
  templateUrl: './cart.component.html',
})
export class CartComponent {
  readonly cart = inject(CartService);
  readonly icons = {
    cart: faCartShopping,
    remove: faTrashCan,
    check: faCheck,
    minus: faMinus,
    plus: faPlus,
  };
  private readonly messages = inject(MessageService);

  onQuantityInput(id: number, event: Event): void {
    if (event.target instanceof HTMLInputElement) this.cart.setQuantity(id, event.target.value);
  }

  constructor() {
    effect(() => {
      const result = this.cart.lastSale();
      if (result)
        this.messages.add({
          severity: 'success',
          summary: result.message,
          detail: `Venta #${result.sale_id} · Total ${result.total}`,
          life: 7000,
        });
    });
  }
}
